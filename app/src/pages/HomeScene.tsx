import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { FLY_TARGETS } from '../lib/flyTargets'

// ── HomeScene: la camera oscura (WebGL, three.js) ───────────────────────────
// La lingua del riferimento (fojcikdominik.com, analisi nel vault): una sala
// buia dove i contenuti appesi SONO la navigazione — «la navigazione è la
// camera». Qui le quattro pagine del sito sono stampe luminose lungo un
// corridoio; la camera viaggia fra le fermate (wheel/trascina/frecce/HUD — i
// driver stanno in FlyThrough, che possiede lo stato) e il puntatore la
// inclina in parallasse REALE fra i piani. Hover e click passano dal
// raycast. Tutto il testo statico è cotto nelle texture (stampe = poster);
// l'HUD resta DOM: più nitido, selezionabile, accessibile.
//
// Prestazioni: niente luci (tutto MeshBasic/additive — la sala è illuminata
// dalle stampe stesse), DPR ≤ 2, il loop si addormenta quando la sezione
// esce dallo schermo o il tab è nascosto, dispose completo allo smount.
// Pausa + niente scena con prefers-reduced-motion (decide FlyThrough).

const PRINT_W = 4.4
const PRINT_H = (PRINT_W * 10) / 16
const FIRST_Z = -4.5
// Il passo supera la distanza di camera: ogni fermata resta fra due stampe,
// mai dietro una — la camera sfiora le pareti, non le attraversa.
const STEP = 9
const FLOOR_Y = -2.35
const FOV = 50
const CAM_DIST = 6.2

// Le stampe sono APPESSE ALLE PARETI del corridoio, alternate nei lati e
// ruotate verso il percorso: la camera viaggia al centro e le sfiora senza
// attraversarle. La normale di un piano ruotato di ry è (sin ry, 0, cos ry):
// per guardare il centro, parete sinistra (x<0) vuole ry POSITIVO, parete
// destra negativo — i versi giusti, non quelli dell'intuizione.
const POSES = [
  { x: -2.7, y: 0, ry: 0.3 },
  { x: 3.0, y: 0.15, ry: -0.3 },
  { x: -3.0, y: -0.1, ry: 0.3 },
  { x: 2.8, y: 0.12, ry: -0.28 },
]

type SceneRefs = {
  activeRef: { current: number }
  pickRef: { current: (i: number) => void }
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

// ── texture ──────────────────────────────────────────────────────────────────

// Una stampa: fondo notturno, bagliore bronzo, fascia di luce, grana,
// vignetta, cornice e tipografia cotta (Italiana + JetBrains Mono).
// Redraw: le texture partono con i font disponibili e vengono RIDISegnate
// quando i font veri arrivano — la scena non aspetta mai i font per partire.
function makePrintTexture(
  index: number,
  maxAniso: number
): { tex: THREE.CanvasTexture; redraw: () => void } {
  const w = 1024
  const h = 640
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')!
  const t = FLY_TARGETS[index]
  let photo: HTMLImageElement | null = null

  if (!t.img.startsWith('data:image/svg+xml,')) {
    photo = new Image()
    photo.decoding = 'async'
  }

  const draw = () => {
    ctx.clearRect(0, 0, w, h)

    const bg = ctx.createLinearGradient(0, 0, w, h)
    bg.addColorStop(0, '#3d3428')
    bg.addColorStop(0.55, '#241d17')
    bg.addColorStop(1, '#14100c')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    if (photo?.complete && photo.naturalWidth > 0) {
      const scale = Math.max(w / photo.naturalWidth, h / photo.naturalHeight)
      const dw = photo.naturalWidth * scale
      const dh = photo.naturalHeight * scale
      ctx.drawImage(photo, (w - dw) / 2, (h - dh) / 2, dw, dh)

      const photoShade = ctx.createLinearGradient(0, 0, 0, h)
      photoShade.addColorStop(0, 'rgba(10,9,7,.16)')
      photoShade.addColorStop(.48, 'rgba(10,9,7,.05)')
      photoShade.addColorStop(1, 'rgba(10,9,7,.82)')
      ctx.fillStyle = photoShade
      ctx.fillRect(0, 0, w, h)
    }

    const gx = w * (0.36 + index * 0.07)
    const glow = ctx.createRadialGradient(gx, h * 0.3, 0, gx, h * 0.3, w * 0.5)
    glow.addColorStop(0, 'rgba(212,183,138,.38)')
    glow.addColorStop(1, 'rgba(212,183,138,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.rotate(((-16 + index * 8) * Math.PI) / 180)
    const beam = ctx.createLinearGradient(-w, 0, w, 0)
    beam.addColorStop(0.38, 'rgba(255,240,218,0)')
    beam.addColorStop(0.5, 'rgba(255,240,218,.13)')
    beam.addColorStop(0.62, 'rgba(255,240,218,0)')
    ctx.fillStyle = beam
    ctx.fillRect(-w, -h * 0.18, w * 2, h * 0.36)
    ctx.restore()

    // grana: tile 128px ripetuto — la grana resta a 1px, non si ingrandisce
    const gcv = document.createElement('canvas')
    gcv.width = 128
    gcv.height = 128
    const gctx = gcv.getContext('2d')!
    const img = gctx.createImageData(128, 128)
    for (let p = 0; p < img.data.length; p += 4) {
      img.data[p] = 255
      img.data[p + 1] = 255
      img.data[p + 2] = 255
      img.data[p + 3] = Math.random() * 14
    }
    gctx.putImageData(img, 0, 0)
    ctx.fillStyle = ctx.createPattern(gcv, 'repeat')!
    ctx.fillRect(0, 0, w, h)

    const vig = ctx.createRadialGradient(w / 2, h * 0.46, h * 0.3, w / 2, h * 0.46, w * 0.72)
    vig.addColorStop(0, 'rgba(0,0,0,0)')
    vig.addColorStop(1, 'rgba(0,0,0,.44)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = 'rgba(255,255,255,.12)'
    ctx.lineWidth = 2
    ctx.strokeRect(12.5, 12.5, w - 25, h - 25)
    ctx.strokeStyle = 'rgba(255,255,255,.04)'
    ctx.lineWidth = 1
    ctx.strokeRect(24.5, 24.5, w - 49, h - 49)

    ctx.textAlign = 'right'
    ctx.font = '280px Italiana, serif'
    ctx.fillStyle = 'rgba(255,255,255,.07)'
    ctx.fillText(`0${index + 1}`, w - 56, 250)
    ctx.textAlign = 'left'

    ctx.shadowColor = 'rgba(0,0,0,.55)'
    ctx.shadowBlur = 18
    ctx.fillStyle = 'rgba(245,243,238,.96)'
    ctx.font = '72px Italiana, serif'
    ctx.fillText(t.label, 64, h - 138)
    ctx.shadowBlur = 0
    const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
    spaced.letterSpacing = '6px'
    ctx.font = '400 21px "JetBrains Mono", monospace'
    ctx.fillStyle = 'rgba(176,169,158,.92)'
    ctx.fillText(t.note.toUpperCase(), 66, h - 92)
    spaced.letterSpacing = '0px'
  }
  draw()

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = maxAniso

  if (photo) {
    photo.onload = () => {
      draw()
      tex.needsUpdate = true
    }
    photo.src = t.img
  }
  return {
    tex,
    redraw: () => {
      draw()
      tex.needsUpdate = true
    },
  }
}

// Alpha per i riflessi: bianco verso il pavimento, nero in profondità.
// (alphaMap legge il canale verde; la mesh è capovolta da scale.y=-1, quindi
// il bianco va sul fondo della texture = la parte che finisce in alto.)
function makeFadeTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 4
  cv.height = 256
  const ctx = cv.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, '#000')
  g.addColorStop(1, '#fff')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 256)
  return new THREE.CanvasTexture(cv)
}

function makeStripTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 64
  cv.height = 64
  const ctx = cv.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 64, 0)
  g.addColorStop(0, 'rgba(212,183,138,0)')
  g.addColorStop(0.5, 'rgba(212,183,138,.85)')
  g.addColorStop(1, 'rgba(212,183,138,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(cv)
}

function makePoolTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 128
  cv.height = 128
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(212,183,138,.7)')
  g.addColorStop(1, 'rgba(212,183,138,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(cv)
}

function makeSpriteTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 64
  cv.height = 64
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,244,224,1)')
  g.addColorStop(0.4, 'rgba(255,244,224,.4)')
  g.addColorStop(1, 'rgba(255,244,224,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(cv)
}

// ── scena ────────────────────────────────────────────────────────────────────

function initScene(host: HTMLElement, refs: SceneRefs): () => void {
  const n = FLY_TARGETS.length

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x14120f, 0.062)

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80)

  const printGeo = new THREE.PlaneGeometry(PRINT_W, PRINT_H)
  const fadeTex = makeFadeTexture()
  const prints: THREE.Mesh[] = []
  const printMats: THREE.MeshBasicMaterial[] = []
  const mirrorMats: THREE.MeshBasicMaterial[] = []
  const redrawPrints: Array<() => void> = []

  FLY_TARGETS.forEach((_, i) => {
    const { tex, redraw } = makePrintTexture(i, renderer.capabilities.getMaxAnisotropy())
    redrawPrints.push(redraw)
    const pose = POSES[i % POSES.length]
    const z = FIRST_Z - i * STEP

    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 })
    const mesh = new THREE.Mesh(printGeo, mat)
    mesh.position.set(pose.x, pose.y, z)
    mesh.rotation.y = pose.ry
    mesh.userData.index = i
    scene.add(mesh)
    prints.push(mesh)
    printMats.push(mat)

    // Riflesso sul pavimento: stampa capovolta, attenuata e dissolta con
    // l'alphaMap — niente Reflector (costoso) per un effetto che in una
    // camera oscura deve essere un sussurro.
    const mmat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      alphaMap: fadeTex,
      depthWrite: false,
    })
    const mirror = new THREE.Mesh(printGeo, mmat)
    mirror.position.set(pose.x, 2 * FLOOR_Y - pose.y, z)
    mirror.rotation.y = pose.ry
    mirror.scale.y = -1
    scene.add(mirror)
    mirrorMats.push(mmat)
  })

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 110),
    new THREE.MeshBasicMaterial({ color: 0x0e0c0a })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, FLOOR_Y - 0.01, -35)
  scene.add(floor)

  // Striscia di luce a pavimento lungo il corridoio (il rimando alle strip
  // del riferimento) + pozza morbida che segue la stampa attiva.
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 110),
    new THREE.MeshBasicMaterial({
      map: makeStripTexture(),
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  )
  strip.rotation.x = -Math.PI / 2
  strip.position.set(0, FLOOR_Y + 0.01, -35)
  scene.add(strip)

  const poolMat = new THREE.MeshBasicMaterial({
    map: makePoolTexture(),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), poolMat)
  pool.rotation.x = -Math.PI / 2
  pool.position.set(0, FLOOR_Y + 0.02, FIRST_Z + 1.4)
  scene.add(pool)

  // Polvere in sospensione: sale lentamente, riappare dal basso.
  const DUST = 240
  const dustPos = new Float32Array(DUST * 3)
  const dustSpeed = new Float32Array(DUST)
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 18
    dustPos[i * 3 + 1] = FLOOR_Y + Math.random() * 7.3
    dustPos[i * 3 + 2] = 6 - Math.random() * 46
    dustSpeed[i] = 0.06 + Math.random() * 0.14
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dustMat = new THREE.PointsMaterial({
    size: 0.06,
    map: makeSpriteTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xd8c4a0,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  scene.add(dust)

  // ── stato e driver ──
  const state = {
    camX: 0,
    camY: 0.12,
    camZ: FIRST_Z + CAM_DIST + 5.5, // l'ingresso parte da più lontano
    lookX: 0,
    lookY: 0,
    lookZ: FIRST_Z,
    swayX: 0,
    swayY: 0,
    hover: -1,
    focus: new Array<number>(n).fill(0),
  }
  // Su viewport ritratto il campo visivo orizzontale è stretto: la camera
  // arretra e allarga (fov) perché la stampa parete entri intera.
  const layout = { dist: 1, camX: 1 }
  let swayTX = 0
  let swayTY = 0
  const ndc = new THREE.Vector2(-2, -2)
  const raycaster = new THREE.Raycaster()
  const t0 = performance.now()

  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect()
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1
    ndc.y = -(((e.clientY - r.top) / r.height) * 2 - 1)
    swayTX = ndc.x * 0.55
    swayTY = ndc.y * 0.28
  }
  const onLeave = () => {
    ndc.set(-2, -2)
    swayTX = 0
    swayTY = 0
  }
  const onClick = () => {
    if (state.hover >= 0) refs.pickRef.current(state.hover)
  }
  // Touch: niente pointerleave affidabile — al tap il hover deve svanire,
  // altrimenti l'ultima stampa toccata resta accesa fino al gesto dopo.
  const onUp = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') {
      ndc.set(-2, -2)
      swayTX = 0
      swayTY = 0
    }
  }
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerleave', onLeave)
  host.addEventListener('pointerup', onUp)
  host.addEventListener('click', onClick)

  let raf = 0
  let running = false
  let last = performance.now()
  let lastRender = last

  // Guardiano: se il loop è "attivo" ma il frame non arriva (ambiente che
  // tace su rAF pur dichiarandosi visible), lo riaccende — un wake perso
  // non deve mai lasciare la scena congelata per sempre.
  const watchdog = window.setInterval(() => {
    if (running && performance.now() - lastRender > 1500) {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(tick)
    }
  }, 1000)

  const tick = (now: number) => {
    if (!running) return
    raf = requestAnimationFrame(tick)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    lastRender = now
    const e = easeOutCubic(Math.min(1, (now - t0) / 2000))

    const i = Math.min(n - 1, Math.max(0, refs.activeRef.current))
    const pose = POSES[i % POSES.length]
    const printZ = FIRST_Z - i * STEP
    const damp = (cur: number, target: number, rate: number) =>
      cur + (target - cur) * (1 - Math.exp(-dt * rate))

    state.swayX = damp(state.swayX, swayTX, 5)
    state.swayY = damp(state.swayY, swayTY, 5)
    state.camX = damp(state.camX, pose.x * 0.3 * layout.camX + state.swayX, 4)
    state.camY = damp(state.camY, 0.12 + state.swayY, 4)
    state.camZ = damp(state.camZ, printZ + CAM_DIST * layout.dist + (1 - e) * 5.5, 4)
    state.lookX = damp(state.lookX, pose.x * 0.95, 4)
    state.lookY = damp(state.lookY, pose.y * 0.9, 4)
    state.lookZ = damp(state.lookZ, printZ, 4)

    camera.position.set(state.camX, state.camY - (1 - e) * 0.85, state.camZ)
    camera.lookAt(state.lookX, state.lookY, state.lookZ)

    // Hover per raycast: il puntatore resta fermo ma la camera si muove —
    // il test va rifatto a ogni frame, non solo al pointermove. Il cursore
    // passa da un data-attribute (non da uno stile inline): così il CSS può
    // farglielo togliere di mezzo con :active durante il trascinamento.
    if (ndc.x > -1.5) {
      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.intersectObjects(prints, false)[0]
      const hovered = hit ? (hit.object.userData.index as number) : -1
      if (hovered !== state.hover) {
        state.hover = hovered
        host.dataset.hover = hovered >= 0 ? 'pointer' : 'grab'
      }
    } else if (state.hover !== -1) {
      state.hover = -1
      host.dataset.hover = 'grab'
    }

    prints.forEach((mesh, k) => {
      const target = k === state.hover ? 1 : k === i ? 0.3 : 0
      state.focus[k] += (target - state.focus[k]) * (1 - Math.exp(-dt * 7))
      const f = state.focus[k]
      const appear = Math.max(0, Math.min(1, e * (n * 0.3 + 0.7) - k * 0.3))
      const baseZ = FIRST_Z - k * STEP
      mesh.scale.setScalar(1 + f * 0.05)
      mesh.position.z = baseZ + f * 0.3
      printMats[k].opacity = appear
      printMats[k].color.setScalar(1 + f * 0.22)
      mirrorMats[k].opacity = 0.13 * appear
    })

    for (let k = 0; k < DUST; k++) {
      dustPos[k * 3 + 1] += dustSpeed[k] * dt
      if (dustPos[k * 3 + 1] > 5) dustPos[k * 3 + 1] = FLOOR_Y
    }
    dustGeo.getAttribute('position')!.needsUpdate = true
    dustMat.opacity = 0.5 * e

    pool.position.x += (pose.x - pool.position.x) * (1 - Math.exp(-dt * 3))
    pool.position.z += (printZ + 1.4 - pool.position.z) * (1 - Math.exp(-dt * 3))
    poolMat.opacity = 0.32 * e

    renderer.render(scene, camera)
  }

  const wake = () => {
    if (running) return
    running = true
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }
  const sleep = () => {
    if (!running) return
    running = false
    cancelAnimationFrame(raf)
  }

  // Il loop vive solo mentre la scena è visibile E il tab è attivo: il flag
  // dell'IO resta l'unica fonte di verità — il visibilitychange da solo può
  // solo addormentare, mai risvegliare (altrimenti un alt-tab rimette in
  // moto una scena fuori schermo e l'IO non la riaddormenta mai più).
  let visible = false
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((en) => en.isIntersecting)
      if (visible && !document.hidden) wake()
      else sleep()
    },
    { threshold: 0.05 }
  )
  io.observe(host)
  const onVisibility = () => {
    if (document.hidden || !visible) sleep()
    else wake()
  }
  document.addEventListener('visibilitychange', onVisibility)

  const resize = () => {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const portrait = camera.aspect < 0.9
    camera.fov = portrait ? 56 : FOV
    layout.dist = portrait ? 1.45 : 1
    layout.camX = portrait ? 0.5 : 1
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)
  resize()

  // Le texture SONO nate con i font disponibili al momento della creazione:
  // vengono ridisegnate al primo font disponibile (via veloce) e DI NUOVO
  // quando i font veri del sito arrivano, comunque tardi — la seconda passa
  // è idempotente, così la tipografia cotta non resta mai quella di riserva.
  const fontsReady = Promise.all([
    document.fonts.load('280px Italiana'),
    document.fonts.load('400 21px "JetBrains Mono"'),
  ]).catch(() => undefined)
  void Promise.race([fontsReady, new Promise((res) => setTimeout(res, 1500))]).then(() => {
    redrawPrints.forEach((redraw) => redraw())
  })
  void fontsReady.then(() => {
    redrawPrints.forEach((redraw) => redraw())
  })

  wake()

  return () => {
    window.clearInterval(watchdog)
    io.disconnect()
    ro.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    host.removeEventListener('pointermove', onMove)
    host.removeEventListener('pointerleave', onLeave)
    host.removeEventListener('pointerup', onUp)
    host.removeEventListener('click', onClick)
    sleep()
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material as THREE.MeshBasicMaterial | undefined
      if (mat) {
        mat.map?.dispose()
        mat.alphaMap?.dispose()
        mat.dispose()
      }
    })
    renderer.dispose()
    // Rilascia il contesto GL adesso, non alla GC: i browser ne contano pochi
    // per pagina e un contesto zombi può spremere quello di /experience.
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }
}

type HomeSceneProps = {
  active: number
  onPick: (i: number) => void
}

export default function HomeScene({ active, onPick }: HomeSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(active)
  const pickRef = useRef(onPick)

  useEffect(() => {
    activeRef.current = active
  }, [active])
  useEffect(() => {
    pickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    // La scena parte SUBITO (le texture nascono con i font disponibili e
    // vengono ridisegnate quando i veri arrivano): nessuna finestra morta
    // fra l'ingresso della sezione e il primo frame.
    const teardown = initScene(host, { activeRef, pickRef })
    return teardown
  }, [])

  return <div ref={hostRef} className="fly-canvas" aria-hidden="true" />
}
