import { useEffect, useMemo, useRef, useState } from 'react'
import type { Route } from '../lib/data'
import { DATA } from '../lib/data'
import { events, featuredEvent, photoUrl } from '../lib/events'
import Clickable from '../components/Clickable'
import './Cover.css'

// Warms the lazy /experience chunk before the first click — the link then
// lands on the rooms with zero extra wait.
const prefetchExperience = () => {
  void import('./Experience')
}

// ── Il flythrough: le pagine del sito come pannelli 3D ───────────────────────
// La lingua del riferimento (fojcikdominik.com): si atterra sulla home, si
// scrorre verso il basso e dentro una sezione sticky la camera scende attraverso
// i pannelli di anteprima delle pagine — solo immagini di riferimento, NON si
// entra nelle pagine — e un click su un pannello porta alla pagina (con la
// zoom-through). Il moto è VERTICALE e guidato dallo scroll: p ∈ [0..1] sul
// rettangolo della sezione, ogni pannello a quota (i − p·reach) · spacing.
// Motion ridotto: niente sticky né 3D — lista statica di link, sempre cliccabile.

type FlyTarget = {
  route: Route
  label: string
  note: string
  img: string
}

function buildFlyTargets(): FlyTarget[] {
  // Quattro coperture distinte dall'archivio locale (ordine: più recente
  // prima), escludendo l'evento in hero — la sua immagine è già sopra.
  const pool = [...events]
    .filter((e) => e.id !== featuredEvent?.id)
    .sort((a, b) => b.date.localeCompare(a.date))
  const cover = (i: number) => {
    const e = pool[i % Math.max(1, pool.length)]
    return e ? photoUrl(e, e.cover) : ''
  }
  return [
    {
      route: 'gallery',
      label: 'Galleria',
      note: 'Le raccolte per categoria',
      img: cover(0),
    },
    {
      route: 'videos',
      label: 'Video',
      note: 'I filmati dell’archivio',
      img: cover(1),
    },
    {
      route: 'experience',
      label: 'Le sale immersive',
      note: 'Il percorso 3D per tema',
      img: cover(2),
    },
    {
      route: 'contact',
      label: 'Contatti',
      note: 'Commissioni e collaborazioni',
      img: cover(3),
    },
  ]
}

function FlyThrough({ go }: { go: (next: Route, ref?: string) => void }) {
  const targets = useMemo(() => buildFlyTargets(), [])
  const n = targets.length
  const sectionRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef<(HTMLDivElement | null)[]>([])
  // Live: il toggle OS a sessione aperta commuta fra camera 3D e lista statica.
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)

  // Driver dello scroll: un rAF per frame di scroll riscrive le trasformazioni
  // dei pannelli e si spegne; il loop non gira mai a riposo.
  useEffect(() => {
    if (reduced || n === 0) return
    const section = sectionRef.current
    if (!section) return
    let raf = 0
    let running = false

    const write = () => {
      running = false
      const rect = section.getBoundingClientRect()
      const sticky = stickyRef.current
      if (!sticky) return
      const vh = window.innerHeight
      const travel = rect.height - vh
      if (travel <= 0) return
      const p = Math.min(1, Math.max(0, -rect.top / travel))
      // Passo corto: i pannelli si sovrappongono leggermente ai bordi — il
      // riferimento è denso, il vuoto fra uno e l'altro è minimo, e la
      // profondità (retreat) tiene leggibile la sovrapposizione.
      const spacing = vh * 0.8
      const reach = n - 1
      // Il clip-out REALE dipende dalla proiezione 3D (viewport +Dimensioni
      // del pannello): una soglia fissa su |d| spoppa su desktop e lascia
      // tabittàre pannelli fuori campo su mobile. Si misura il rettangolo
      // PROIETTATO di ogni slot contro quello dello sticky — 4 letture a
      // frame di scroll, layout già flushato dalle scritture sopra.
      const stageRect = sticky.getBoundingClientRect()
      slotRefs.current.forEach((el, i) => {
        if (!el) return
        const d = i - p * reach
        const ad = Math.abs(d)
        // Scrivi SEMPRE la trasformazione: un cutoff che salta la scrittura
        // congela il pannello all'ultima posizione in campo (a metà schermo)
        // mentre p prosegue — il pannello deve continuare il suo moto oltre
        // la soglia.
        const x = (i % 2 === 0 ? -1 : 1) * window.innerWidth * 0.05
        const y = d * spacing
        const z = -ad * 420
        const ry = (i % 2 === 0 ? 1 : -1) * 11
        const scale = 1 - Math.min(ad * 0.09, 0.2)
        el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(4deg) rotateY(${ry.toFixed(2)}deg) scale(${scale.toFixed(4)})`
        const op = Math.max(0, 1 - ad * 0.6)
        el.style.opacity = String(op)
        // Blur QUANTIZZATO a passi da 1px: un raggio che cambia di continuo
        // forza il re-filter del layer a ogni frame — a scatti no.
        const blur = Math.round(Math.min(ad * 6, 9))
        el.style.filter = blur > 0 ? `blur(${blur}px)` : 'none'
        // Fuori dallo sticky (proiezione reale, 8px di margine) il pannello
        // esce da tab order e hit-test: niente focus in pannelli invisibili,
        // e sotto il 30% di opacità i click non vengono intercettati nella
        // fascia di sovrapposizione fra pannelli.
        const r = el.getBoundingClientRect()
        const off = r.bottom < stageRect.top - 8 || r.top > stageRect.bottom + 8
        const vis = off ? 'hidden' : 'visible'
        if (el.style.visibility !== vis) el.style.visibility = vis
        el.style.pointerEvents = op < 0.3 ? 'none' : ''
      })
      const rounded = Math.max(0, Math.min(n - 1, Math.round(p * reach)))
      if (rounded !== activeRef.current) {
        activeRef.current = rounded
        setActive(rounded)
      }
    }
    const onScroll = () => {
      if (running) return
      running = true
      raf = requestAnimationFrame(write)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    write()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reduced, n])

  // Motion ridotto: niente camera — le anteprime sono una lista statica di
  // link, pienamente cliccabile e leggibile.
  if (reduced) {
    return (
      <section className="fly fly-fallback" aria-label="Le pagine del sito">
        <div className="container">
          <p className="t-meta fly-kicker">Le pagine del sito</p>
          <div className="fly-fallback-list">
            {targets.map((t, i) => (
              <Clickable key={t.route} className="fly-fallback-item" onClick={() => go(t.route)}>
                <img src={t.img} alt="" loading="lazy" decoding="async" />
                <span className="fly-fallback-caption t-meta">
                  [0{i + 1}] {t.label}
                </span>
              </Clickable>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={sectionRef}
      className="fly"
      style={{ height: `${100 + (n - 1) * 112}vh` }}
      aria-label="Le pagine del sito — scorri fra le anteprime e clicca per entrare"
    >
      <div ref={stickyRef} className="fly-sticky">
        {/* HUD indice, la lista fissa del riferimento: la voce della fascia
            centrata si accende in bronzo; click = vola alla pagina. */}
        <div className="fly-hud">
          <p className="t-meta fly-kicker">Le pagine del sito</p>
          {targets.map((t, i) => (
            <button
              key={t.route}
              type="button"
              className="fly-hud-item t-meta"
              data-active={i === active || undefined}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => go(t.route)}
              onMouseEnter={t.route === 'experience' ? prefetchExperience : undefined}
              onFocus={t.route === 'experience' ? prefetchExperience : undefined}
            >
              [0{i + 1}] {t.label}
            </button>
          ))}
        </div>

        <div className="fly-world">
          {targets.map((t, i) => (
            <div
              key={t.route}
              ref={(el) => {
                slotRefs.current[i] = el
              }}
              className="fly-slot"
            >
              <Clickable
                className="fly-plane"
                onClick={() => go(t.route)}
                aria-label={`Apri ${t.label}`}
              >
                {t.img && (
                  <img src={t.img} alt="" loading="lazy" decoding="async" draggable={false} />
                )}
                <span className="fly-plane-caption" aria-hidden="true">
                  <span className="fly-plane-num">[0{i + 1}]</span> {t.label}
                  <span className="fly-plane-note">{t.note}</span>
                </span>
              </Clickable>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Cover({ go }: { go: (next: Route, ref?: string) => void }) {
  const featured = featuredEvent

  // The build writes a 3× upscale (hero.jpg) of the featured cover for the
  // full-screen banner; the original 1080px cover.jpg stays the fallback when
  // the upscale is missing (dev server, or a build without ffmpeg).
  const [heroFailed, setHeroFailed] = useState(false)
  const src = featured
    ? heroFailed
      ? photoUrl(featured, featured.cover)
      : photoUrl(featured, 'hero.jpg')
    : undefined

  return (
    <main>
      <section className="hero">
        <div className="hero-photo">
          {featured && (
            <img
              src={src}
              alt={DATA.identity.role}
              fetchPriority="high"
              decoding="async"
              onError={() => setHeroFailed(true)}
            />
          )}
        </div>
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="hero-role">{DATA.identity.role}</div>
          <h1 className="hero-name">{DATA.identity.name}</h1>
          <div className="hero-location">{DATA.identity.location}</div>
          <div className="hero-cta">
            <button className="btn" onClick={() => go('gallery')}>
              Vedi la galleria
            </button>
            <button
              className="hero-exp"
              onClick={() => go('experience')}
              onMouseEnter={prefetchExperience}
              onFocus={prefetchExperience}
            >
              Le sale immersive
            </button>
          </div>
        </div>
        <div className="hero-scrollcue" aria-hidden="true">
          <span className="t-meta">Scorri</span>
          <span className="hero-scrollcue-line" />
        </div>
      </section>
      <FlyThrough go={go} />
    </main>
  )
}
