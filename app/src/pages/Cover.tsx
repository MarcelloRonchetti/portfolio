import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import type { Route } from '../lib/data'
import { DATA } from '../lib/data'
import { featuredEvent, photoUrl } from '../lib/events'
import { FLY_TARGETS, webglSupported } from '../lib/flyTargets'
import { getCustomHero } from '../lib/customHero'
import { useDriveContent } from '../hooks/useDriveContent'
import Clickable from '../components/Clickable'
import FlyDeck from './FlyDeck'
import './Cover.css'

// Warms the lazy /experience chunk before the first click — the link then
// lands on the rooms with zero extra wait.
const prefetchExperience = () => {
  void import('./Experience')
}

// ── L'indice della home: la camera oscura ───────────────────────────────────
// La pagina NON scorre: la sezione è alta esattamente una viewport e la
// navigazione È la camera (fojcikdominik.com, analisi nel vault). FlyThrough
// possiede lo stato (attivo, ingresso) e TUTTI i driver: rotella (con
// RILASCIO ai bordi — nessuna trappola di scroll), trascinamento orizzontale,
// frecce, lista HUD. La scena è WebGL (HomeScene, chunk separato con three.js)
// quando il dispositivo la regge; la pila CSS (FlyDeck) fa da riserva mentre
// il chunk carica e per sempre dove la scena non arriva. Motion ridotto:
// lista statica di link. Le anteprime sono segnaposto finché le animazioni
// non sono chiuse: sostituirle = campo `img` in lib/flyTargets.ts.

type SceneComponent = ComponentType<{ active: number; onPick: (i: number) => void }>

function FlyThrough({ go }: { go: (next: Route, ref?: string) => void }) {
  const targets = FLY_TARGETS
  const n = targets.length
  const sectionRef = useRef<HTMLElement>(null)
  // Live: il toggle OS a sessione aperta commuta fra scena e lista statica.
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
  // Specchio per i listener (wheel/drag): mai una chiusura stantia sullo stato.
  const activeRef = useRef(0)
  // Un trascinamento oltre soglia ingoia il click che il pointerup genera.
  const movedRef = useRef(false)
  const [entered, setEntered] = useState(false)
  const [entering, setEntering] = useState(false)
  const glOk = useMemo(() => webglSupported(), [])
  // Il chunk WebGL si precarica subito (prima che serva), la scena si monta
  // solo quando la sezione entra in campo. Fallimento = la pila resta PER
  // SEMPRE come interfaccia vera (e deve restare accessibile), non come
  // segnaposto transitorio.
  const [Scene, setScene] = useState<SceneComponent | null>(null)
  const [chunkFailed, setChunkFailed] = useState(false)

  const step = useCallback(
    (dir: 1 | -1) => {
      setActive((prev) => {
        const next = Math.min(n - 1, Math.max(0, prev + dir))
        activeRef.current = next
        return next
      })
    },
    [n]
  )

  // HUD e stampa laterale: selezionare quella già davanti = entrare.
  const select = useCallback(
    (i: number) => {
      if (i === activeRef.current) {
        go(targets[i].route)
        return
      }
      activeRef.current = i
      setActive(i)
    },
    [go, targets]
  )

  // Rotella: accumulo con decay + lock — un gesto = un passo. Il delta è
  // NORMALIZZATO a pixel (Firefox riporta le tacche del mouse in righe,
  // deltaY≈3: senza normalizzazione un passo costerebbe ~16 tacche). La
  // camera prende il comando SOLO a sezione intera (top ≤ 0 e bottom ≥ vh):
  // con una soglia parziale la prima tacca utile parcheggerebbe la pagina
  // a metà sezione e l'HUD resterebbe sotto il fold. Ai bordi del percorso
  // NON preventDefault: la pagina torna a scorrere, nessuna trappola.
  useEffect(() => {
    if (reduced || n === 0) return
    const section = sectionRef.current
    if (!section) return
    let acc = 0
    let lockUntil = 0
    let lastWheel = 0
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // pinch-zoom non è navigazione
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      if (rect.top > 0 || rect.bottom < vh) return // non intera: scrolla
      const now = performance.now()
      if (now - lastWheel > 200) acc = 0
      lastWheel = now
      const raw = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX
      const dy =
        e.deltaMode === 1 ? raw * 16 : e.deltaMode === 2 ? raw * window.innerHeight : raw
      if (now < lockUntil) {
        e.preventDefault()
        return
      }
      if (
        (activeRef.current === 0 && dy < 0) ||
        (activeRef.current === n - 1 && dy > 0)
      ) {
        return // bordo: la pagina scorre
      }
      e.preventDefault()
      acc += dy
      if (Math.abs(acc) >= 48) {
        step(acc > 0 ? 1 : -1)
        acc = 0
        lockUntil = now + 520
      }
    }
    section.addEventListener('wheel', onWheel, { passive: false })
    return () => section.removeEventListener('wheel', onWheel)
  }, [reduced, n, step])

  // Trascinamento orizzontale (mouse e touch): swipe = un passo. touch-action
  // pan-y lascia lo scroll verticale al browser — pointercancel lo chiude.
  useEffect(() => {
    if (reduced || n === 0) return
    const section = sectionRef.current
    if (!section) return
    let dragging = false
    let startX = 0
    let pid = -1
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      dragging = true
      pid = e.pointerId
      startX = e.clientX
      movedRef.current = false
    }
    const move = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pid) return
      if (Math.abs(e.clientX - startX) > 12) movedRef.current = true
    }
    const end = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pid) return
      dragging = false
      const dx = e.clientX - startX
      if (Math.abs(dx) >= 48) {
        step(dx < 0 ? 1 : -1)
        movedRef.current = true
      }
    }
    const cancel = (e: PointerEvent) => {
      if (e.pointerId === pid) dragging = false
    }
    section.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', cancel)
    return () => {
      section.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [reduced, n, step])

  // Ingresso: la prima volta che la sezione entra in campo la camera parte
  // dal fondo e le stampe si accendono (la scena gestisce il proprio esordio;
  // data-entering scaglionava la pila di riserva).
  useEffect(() => {
    if (reduced || n === 0) return
    const section = sectionRef.current
    if (!section) return
    let timer = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          setEntered(true)
          setEntering(true)
          io.disconnect()
          timer = window.setTimeout(() => setEntering(false), 2100)
        }
      },
      { threshold: 0.35 }
    )
    io.observe(section)
    return () => {
      io.disconnect()
      if (timer) window.clearTimeout(timer)
    }
  }, [reduced, n])

  useEffect(() => {
    if (reduced || !glOk) return
    let alive = true
    import('./HomeScene')
      .then((m) => {
        if (alive) setScene(() => m.default)
      })
      .catch(() => {
        /* chunk irraggiungibile: la pila CSS diventa l'interfaccia definitiva */
        setChunkFailed(true)
      })
    return () => {
      alive = false
    }
  }, [reduced, glOk])

  // Posizione lungo il corridoio: 0 = davanti, poi le successive (raw
  // 0..n-1; raw > n/2 rientra come negativo — con n=4: 0,1,2,-1).
  const offsets = targets.map((_, i) => {
    const raw = (((i - active) % n) + n) % n
    return raw > n / 2 ? raw - n : raw
  })

  const guardPick = useCallback(
    (i: number) => {
      if (movedRef.current) {
        movedRef.current = false
        return
      }
      select(i)
    },
    [select]
  )

  // Stessa guardia per l'HUD e le frecce: un trascinamento che inizia e
  // finisce su un bottone genera un click — non deve navigare né doppiare
  // il passo. Le frecce passano -1/-2 e vengono smistate qui.
  const guardSelect = useCallback(
    (i: number) => {
      if (movedRef.current) {
        movedRef.current = false
        return
      }
      if (i === -1) step(-1)
      else if (i === -2) step(1)
      else select(i)
    },
    [select, step]
  )

  // Motion ridotto: niente camera — le anteprime sono una lista statica di
  // link, pienamente cliccabile e leggibile.
  if (reduced) {
    return (
      <section className="fly fly-fallback" aria-label="Le pagine del sito">
        <div className="container">
          <p className="t-meta fly-kicker">Le pagine del sito</p>
          <div className="fly-fallback-list">
            {targets.map((t, i) => (
              <Clickable
                key={t.route}
                className="fly-fallback-item"
                onClick={() => go(t.route)}
                onMouseEnter={t.route === 'experience' ? prefetchExperience : undefined}
                onFocus={t.route === 'experience' ? prefetchExperience : undefined}
              >
                <img src={t.img} alt="" loading="lazy" decoding="async" />
                <span className="fly-fallback-caption t-meta">
                  <span className="fly-fallback-num">0{i + 1}</span> {t.label}
                  <span className="fly-fallback-note">{t.note}</span>
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
      tabIndex={0}
      data-entered={entered || undefined}
      data-entering={entering || undefined}
      aria-label="Le pagine del sito — usa le frecce per muoverti"
      onKeyDown={(e) => {
        // Il keyboard non è mai un trascinamento: se un drag è finito senza
        // consumare il proprio flag, da qui in poi non deve mangiare nulla.
        movedRef.current = false
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          step(1)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          step(-1)
        }
      }}
    >
      <div className="fly-stage">
        <div className="fly-horizon" aria-hidden="true" />

        <header className="fly-head">
          <p className="t-meta fly-kicker">Le pagine del sito</p>
        </header>

        {Scene && entered ? (
          <Scene active={active} onPick={guardPick} />
        ) : (
          <FlyDeck
            targets={targets}
            offsets={offsets}
            movedRef={movedRef}
            onPick={guardPick}
            onPrefetchExperience={prefetchExperience}
            // Transitorio SOLO mentre il chunk WebGL è in arrivo: se la scena
            // non arriverà mai, la pila è l'interfaccia vera e resta
            // raggiungibile da tastiera e screen reader.
            ariaHidden={glOk && !chunkFailed}
          />
        )}

        {/* HUD: lista-indice a sinistra (seleziona / entra), contatore e frecce
            a destra. La voce attiva è sottolineata in bronzo. I click passano
            tutti da guardSelect: un trascinamento che finisce su un bottone
            non deve navigare. */}
        <div className="fly-hud">
          <div className="fly-hud-list">
            {targets.map((t, i) => (
              <button
                key={t.route}
                type="button"
                className="fly-hud-item"
                data-active={i === active || undefined}
                aria-current={i === active ? 'true' : undefined}
                aria-label={`0${i + 1} ${t.label}`}
                onClick={() => guardSelect(i)}
                onMouseEnter={t.route === 'experience' ? prefetchExperience : undefined}
                onFocus={t.route === 'experience' ? prefetchExperience : undefined}
              >
                <span className="fly-hud-num" aria-hidden="true">
                  0{i + 1}
                </span>
                <span className="fly-hud-label">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="fly-hud-nav">
            <p className="fly-count" aria-hidden="true">
              {String(active + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
            </p>
            <button
              type="button"
              className="fly-arrow"
              onClick={() => guardSelect(-1)}
              disabled={active === 0}
              aria-label="Collegamento precedente"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M10 2 4 8l6 6" />
              </svg>
            </button>
            <button
              type="button"
              className="fly-arrow"
              onClick={() => guardSelect(-2)}
              disabled={active === n - 1}
              aria-label="Collegamento successivo"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M6 2l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Annuncio vivo: fuori dal contatore visibile (che su mobile è
            display:none) così la Lettore di schermo lo sente a ogni
            larghezza. */}
        <p className="fly-sr" aria-live="polite">
          {targets[active].label}, pagina {active + 1} di {n}
        </p>

        <div className="fly-progress" aria-hidden="true">
          <span style={{ width: `${((active + 1) / n) * 100}%` }} />
        </div>
      </div>
    </section>
  )
}

export function Cover({ go }: { go: (next: Route, ref?: string) => void }) {
  const customHero = useMemo(() => getCustomHero(), [])
  const { content: driveContent } = useDriveContent()
  const driveHero = driveContent?.hero ?? null
  const featured = featuredEvent

  const [heroFailed, setHeroFailed] = useState(false)

  // Priority order for the full-screen landing banner:
  // 1. Local custom camera master placed in public/hero/ (e.g. hero.jpg)
  // 2. Google Drive hero (hero.jpg or in hero/ folder in root of Drive archive)
  // 3. Featured event with 3× Lanczos upscale (fallback to original 1080px cover)
  const heroImage = useMemo(() => {
    if (customHero) {
      return {
        src: customHero.src,
        srcSet: customHero.srcSet,
      }
    }
    if (driveHero) {
      return {
        src: driveHero.displayUrl,
        srcSet: driveHero.srcSet,
      }
    }
    if (featured) {
      const src = heroFailed
        ? photoUrl(featured, featured.cover)
        : photoUrl(featured, 'hero.jpg')
      return {
        src,
        srcSet: undefined,
      }
    }
    return null
  }, [customHero, driveHero, featured, heroFailed])

  return (
    <main>
      <section className="hero">
        <div className="hero-photo">
          {heroImage && (
            <img
              src={heroImage.src}
              srcSet={heroImage.srcSet}
              sizes="100vw"
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
