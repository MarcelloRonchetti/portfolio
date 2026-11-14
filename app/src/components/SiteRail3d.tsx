import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RAIL_FACES } from '../lib/data'
import './SiteRail3d.css'

// ── Il rail 3D del sito ──────────────────────────────────────────────────────
// Le quattro facce principali (copertina, galleria, video, contatti) vivono
// come pannelli inclinati in uno spazio 3D: la camera scivola da una faccia
// all'altra su ruota/swipe/frecce, con le vicine visibili di lato e smorzate
// in profondità — il linguaggio di fojcikdominik.com e di /experience, che
// usa lo stesso loop di camera (easing esponenziale, auto-stop).
//
// Il router resta la fonte di verità dell'URL: un cambio faccia aggiorna il
// path con una navigate PLANA (la camera È la transizione; le View Transition
// restano per entrare/uscire dal rail — storie, room, /experience). Le quattro
// pagine sono SEMPRE montate, una visibile: la faccia uscente resta in scena
// mentre la camera se ne va. Ogni faccia scorre DENTRO di sé (overflow-y): la
// ruota scrorre la pagina e solo al bordo (top/bottom) gira alla faccia
// successiva — le stesse guardie del vecchio carosello di sito.

// Geometria della fila (ricalcolata al resize): distanza fra le facce,
// arretramento in profondità e inclinazione laterale delle vicine. A riposo
// le vicine restano appena fuori campo (gap > larghezza): si vedono solo
// DURANTE il volo, inclinate — mai come brandelle.
const FACE_ANGLE = 18 // gradi di rotateY per faccia di distanza
const SNAP_S = 4.6 // velocità dell'easing esponenziale verso la faccia bersaglio
const WHEEL_STEP = 40 // accumulo px per committare una faccia (una tacca)
const TOUCH_STEP = 90 // px di swipe per committare
const NAV_LOCK_MS = 780 // copre l'easing ~0.6s: niente facce a catena

function railIndexOf(pathname: string): number {
  const i = RAIL_FACES.findIndex((f) =>
    f.path === '/' ? pathname === '/' : pathname.startsWith(f.path)
  )
  return i < 0 ? 0 : i
}

export default function SiteRail3d({
  faces,
  onActiveChange,
}: {
  faces: ReactNode[]
  /** La faccia viva, per chi deve modellarsi su di lei (es. eager/LCP della galleria). */
  onActiveChange?: (i: number) => void
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // La faccia iniziale si legge UNA volta sola al mount (deep link): gli
  // initializer di useState girano una volta per mount — il compiler li accetta.
  const [initial] = useState(() => railIndexOf(pathname))
  const [active, setActive] = useState(initial)
  const [announce, setAnnounce] = useState('')
  const activeRef = useRef(initial)
  const posRef = useRef(initial)
  const targetRef = useRef(initial)
  const faceRefs = useRef<(HTMLElement | null)[]>([])
  const geoRef = useRef({ gap: 0, retreat: 0 })
  const lockRef = useRef(0)
  const navToRef = useRef(pathname)
  // Il loop si auto-ferma a riposo: wake è ilHANDLE per riaccenderlo da fuori
  // (cambi path, resize). Ogni input lo chiama — senza questo, un commit
  // dopo lo stop lascerebbe l'URL mutata e la camera immobile.
  const wakeRef = useRef<() => void>(() => {})

  const count = faces.length

  const commit = useCallback(
    (dir: 1 | -1) => {
      const now = performance.now()
      if (now < lockRef.current) return
      const next = Math.min(count - 1, Math.max(0, Math.round(targetRef.current) + dir))
      if (next === Math.round(targetRef.current)) return
      targetRef.current = next
      lockRef.current = now + NAV_LOCK_MS
      navigate(RAIL_FACES[next].path)
      wakeRef.current()
    },
    [count, navigate]
  )

  // Il path comanda la faccia (header, HUD, deep link): la camera se va con
  // l'easing. Al primo render la camera parte già a posto (niente volo).
  useEffect(() => {
    const i = railIndexOf(pathname)
    if (navToRef.current === pathname) return
    navToRef.current = pathname
    targetRef.current = i
    wakeRef.current()
  }, [pathname])

  // ── Camera loop: un solo rAF scrive le trasformazioni e si spegne a riposo ──
  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth
      geoRef.current = { gap: w * 1.02, retreat: w * 0.16 }
      // Il resize cambia la proiezione: le trasformazioni a riposo vanno
      // riscritte subito, altrimenti una faccia vicina resta parcheggiata
      // in campo con la geometria della finestra vecchia.
      wakeRef.current()
    }

    let raf = 0
    let running = false
    let last = performance.now()
    let idleFrames = 0

    const wake = () => {
      if (running) return
      running = true
      idleFrames = 0
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
    wakeRef.current = wake

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (document.hidden) {
        running = false
        return
      }
      const prevPos = posRef.current
      const target = targetRef.current
      posRef.current += (target - posRef.current) * (1 - Math.exp(-dt * SNAP_S))
      if (Math.abs(target - posRef.current) < 0.0015) posRef.current = target

      const { gap, retreat } = geoRef.current
      faceRefs.current.forEach((el, i) => {
        if (!el) return
        const d = i - posRef.current
        const ad = Math.abs(d)
        if (ad > 1.55) {
          if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden'
          return
        }
        if (el.style.visibility !== 'visible') el.style.visibility = 'visible'
        const x = d * gap
        const z = -ad * retreat
        const ry = -d * FACE_ANGLE
        const scale = 1 - Math.min(ad * 0.07, 0.14)
        el.style.transform = `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scale(${scale.toFixed(4)})`
        el.style.opacity = String(Math.max(0, 1 - ad * 0.85))
        el.style.filter = ad > 0.05 ? `blur(${Math.min(ad * 7, 10).toFixed(1)}px)` : 'none'
      })

      const rounded = Math.round(posRef.current)
      if (rounded !== activeRef.current) {
        activeRef.current = rounded
        setActive(rounded)
        onActiveChange?.(rounded)
        setAnnounce(`${RAIL_FACES[rounded]?.label ?? ''} — pagina ${rounded + 1} di ${count}`)
      }

      const settled = Math.abs(posRef.current - prevPos) < 0.0003
      idleFrames = settled ? idleFrames + 1 : 0
      if (idleFrames > 18) {
        running = false
        return
      }
      raf = requestAnimationFrame(tick)
    }

    // ── Input: la ruota scrorre la faccia; solo al bordo gira la camera ──
    const blocked = () =>
      document.querySelector('[aria-modal="true"], .lightbox, .video-lightbox') !== null
    const atEdge = (edge: 'top' | 'bottom') => {
      const el = faceRefs.current[Math.round(posRef.current)]
      if (!el) return false
      return edge === 'top'
        ? el.scrollTop <= 2
        : el.scrollTop + el.clientHeight >= el.scrollHeight - 2
    }
    // Accumulo con decadimento: i trackpad emettono molti eventi piccoli —
    // un solo evento da ≥40px non arriva mai. Il lock in commit evita le catene.
    let acc = 0
    let lastWheel = 0
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || blocked()) return
      const now = performance.now()
      if (now < lockRef.current) return
      if (now - lastWheel > 180) acc = 0
      lastWheel = now
      // Firefox conta righe, non pixel (deltaY ≈ 3 per tacca)
      const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY
      acc += dy
      const idx = Math.round(posRef.current)
      const canDown = idx === 0 ? true : atEdge('bottom') // la copertina gira subito
      if (acc >= WHEEL_STEP && canDown) {
        acc = 0
        commit(1)
      } else if (acc <= -WHEEL_STEP && atEdge('top')) {
        acc = 0
        commit(-1)
      } else if (acc > 300 || acc < -300) {
        acc = 0 // buffer limitato senza firing
      }
    }
    let touchY: number | null = null
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) touchY = e.touches[0].clientY
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (touchY === null || blocked()) return
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY)
      touchY = null
      if (Math.abs(dy) < TOUCH_STEP) return
      const now = performance.now()
      if (now < lockRef.current) return
      const idx = Math.round(posRef.current)
      const canDown = idx === 0 ? true : atEdge('bottom')
      if (dy > 0 && canDown) commit(1)
      else if (dy < 0 && atEdge('top')) commit(-1)
    }
    const onKey = (e: KeyboardEvent) => {
      if (blocked()) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        commit(1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        commit(-1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        navigate(RAIL_FACES[0].path)
        wakeRef.current()
      } else if (e.key === 'End') {
        e.preventDefault()
        navigate(RAIL_FACES[count - 1].path)
        wakeRef.current()
      }
    }
    const onVisibility = () => {
      if (!document.hidden) wake()
    }

    window.addEventListener('resize', measure)
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onVisibility)
    measure()
    wake()
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(raf)
      wakeRef.current = () => {}
    }
  }, [count, commit, navigate, onActiveChange])

  // Il rail possiede lo scrolling della pagina: niente scroll del body, il
  // footer globale lascia il posto a quello dentro ogni faccia.
  useEffect(() => {
    document.body.dataset.rail = '1'
    document.body.style.overscrollBehaviorY = 'none'
    return () => {
      delete document.body.dataset.rail
      document.body.style.overscrollBehaviorY = ''
    }
  }, [])

  // Le facce inattive sono inert (fuori dal tab order e dall'hit-test) oltre
  // che aria-hidden: il tab non scatta mai in un pannello fuori campo, e il
  // focus lì dentro viene rilasciato dal browser quando inert scatta.
  useEffect(() => {
    onActiveChange?.(initial)
  }, [onActiveChange, initial])

  return (
    <div className="rail" id="contenuto" tabIndex={-1}>
      <div className="rail-stage" role="group" aria-label="Pagine del sito">
        {faces.map((face, i) => (
          <div
            key={RAIL_FACES[i]?.path ?? i}
            ref={(el) => {
              faceRefs.current[i] = el
            }}
            className="rail-face"
            aria-hidden={i !== active || undefined}
            inert={i !== active || undefined}
          >
            {face}
          </div>
        ))}
      </div>
      <nav className="rail-hud" aria-label="Indice delle pagine">
        {RAIL_FACES.map((f, i) => (
          <button
            key={f.path}
            className="rail-hud-item"
            data-active={i === active || undefined}
            aria-current={i === active ? 'page' : undefined}
            onClick={() => {
              if (i !== active) navigate(f.path)
              wakeRef.current()
            }}
          >
            <span className="rail-hud-num">[0{i + 1}]</span> {f.label}
          </button>
        ))}
      </nav>
      <p className="sr-only" role="status">
        {announce}
      </p>
    </div>
  )
}
