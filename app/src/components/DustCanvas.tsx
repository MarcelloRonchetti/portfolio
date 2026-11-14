import { useEffect, useRef } from 'react'

// Polvere inControluce per le sezioni scure (strato .dust in index.css):
// granuli lenti che attraversano la luce delle pozze, repinti piano dal
// puntatore. Canvas 2D fisso parcheggiato tra le pozze (z 0) e la grana
// (z 2), nascosto sulle sezioni chiare dal CSS. ≤ 36 cerchi per frame:
// costo trascurabile; il loop si ferma a tab nascosto e fuori dalle sezioni
// scure (observer su body[data-section]). È movimento puro: con
// prefers-reduced-motion il componente non disegna nulla.
const MOTE_COUNT = 36
const DPR_CAP = 2
// Raggio di repulsione del puntatore (px) e spinta massima (px/s).
const REPEL_RADIUS = 120
const REPEL_PUSH = 26

// Colore dei granuli: triplete --glow (bronzo di giorno, grigio di notte).
// Il canvas non legge il CSS a ogni frame: si ricampiona ogni ~2s — costo
// trascurabile rispetto a un getComputedStyle per disegno.
function readDustColor(): [number, number, number] {
  const raw = getComputedStyle(document.body).getPropertyValue('--glow').trim()
  const parts = raw.split(',').map((s) => Number.parseInt(s, 10))
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return [parts[0], parts[1], parts[2]]
  }
  return [194, 166, 120]
}

type Mote = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  phase: number
  twinkle: number
}

export default function DustCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const fine = window.matchMedia?.('(pointer: fine)').matches ?? false

    let w = window.innerWidth
    let h = window.innerHeight
    let color = readDustColor()
    let colorAt = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      // Il canvas è un replaced element: senza size CSS il BOX segue la
      // dimensione del bitmap — su schermi dpr≠1 verrebbe a misurare 2× la
      // viewport e metà sciame resterebbe fuori schermo. Il bitmap resta
      // w*dpr per la nitidezza, il box torna alla viewport.
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const spawn = (): Mote => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 14,
      // Sale piano, come polvere in una colonna di luce del proiettore.
      vy: -4 - Math.random() * 10,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.4 + Math.random() * 0.9,
    })
    const motes: Mote[] = Array.from({ length: MOTE_COUNT }, spawn)

    // Repulsione solo con puntatori fini: il touch non deve agitare la
    // polvere mentre si scrolla.
    let px = -1e4
    let py = -1e4
    const onMove = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
    }
    // Il puntatore esce dalla finestra: la scavo si richiude.
    const onLeave = () => {
      px = -1e4
      py = -1e4
    }
    if (fine) {
      window.addEventListener('pointermove', onMove, { passive: true })
      document.documentElement.addEventListener('mouseleave', onLeave)
    }

    let raf = 0
    let last = 0

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      if (now - colorAt > 2000) {
        colorAt = now
        color = readDustColor()
      }

      ctx.clearRect(0, 0, w, h)
      const t = now / 1000
      for (const m of motes) {
        m.phase += dt * m.twinkle
        m.x += (m.vx + Math.sin(t * 0.6 + m.phase * 2) * 6) * dt
        m.y += m.vy * dt

        const dx = m.x - px
        const dy = m.y - py
        const d2 = dx * dx + dy * dy
        if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 1) {
          const d = Math.sqrt(d2)
          const push = ((REPEL_RADIUS - d) / REPEL_RADIUS) * REPEL_PUSH
          m.x += (dx / d) * push * dt
          m.y += (dy / d) * push * dt
        }

        // Wrap ai bordi: la polvere non muore mai, rientra dal lato opposto
        // (sale sempre: rientra dal fondo).
        if (m.y < -8) {
          m.y = h + 8
          m.x = Math.random() * w
        }
        if (m.x < -8) m.x = w + 8
        else if (m.x > w + 8) m.x = -8

        const alpha = 0.1 + 0.16 * (0.5 + 0.5 * Math.sin(m.phase * 2.4))
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha.toFixed(3)})`
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }

    const isDark = () => document.body.getAttribute('data-section') === 'dark'
    const start = () => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }
    const onVisibility = () => {
      if (document.hidden) stop()
      else if (isDark()) start()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Il toggle OS di reduced-motion a sessione aperta, in ENTRAMBI i versi:
    // attivandosi la polvere si ferma e si cancella (il canvas vuoto è
    // invisibile da solo); disattivandosi riparte se la sezione è scura.
    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onReducedChange = () => {
      if (reducedMq.matches) {
        stop()
        ctx.clearRect(0, 0, w, h)
      } else if (isDark() && !document.hidden) {
        start()
      }
    }
    reducedMq.addEventListener?.('change', onReducedChange)

    // Il cambio sezione è un attributo del body: fuori dalle sezioni scure il
    // loop si ferma del tutto, al ritorno riparte.
    const sectionWatcher = new MutationObserver(() => {
      if (document.hidden) return
      if (isDark()) start()
      else stop()
    })
    sectionWatcher.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-section'],
    })

    // Avvio al mount: solo se la sezione è scura, la pagina visibile e il
    // reduced-motion NON attivo. Il listener sui toggle resta montato anche
    // quando si parte sotto reduced-motion — il re-enable a caldo funziona.
    if (!reducedMq.matches && isDark() && !document.hidden) start()

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      if (fine) {
        window.removeEventListener('pointermove', onMove)
        document.documentElement.removeEventListener('mouseleave', onLeave)
      }
      document.removeEventListener('visibilitychange', onVisibility)
      reducedMq.removeEventListener?.('change', onReducedChange)
      sectionWatcher.disconnect()
    }
  }, [])

  // Il canvas esiste sempre: sotto reduced-motion il CSS lo nasconde
  // (display: none) e l'effetto non avvia mai il loop — così il toggle OS a
  // sessione aperta può anche RIACCENDERLO senza remount.
  return <canvas ref={canvasRef} className="dust" aria-hidden="true" />
}
