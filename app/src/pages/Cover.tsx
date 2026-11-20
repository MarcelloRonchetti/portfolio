import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GoFn } from '../lib/data'
import { DATA } from '../lib/data'
import { collections, eventById, events, featuredEvent, photoUrl } from '../lib/events'
import { getAllCustomHeroes } from '../lib/customHero'
import { moveHeroIndex } from '../lib/heroSequence'
import { HERO_ROTATION_INTERVAL_MS } from '../lib/heroRotation'
import { useDriveContent } from '../hooks/useDriveContent'
import Clickable from '../components/Clickable'
import './Cover.css'

// Copertina: hero fotografico a schermo intero (carosello lento delle
// fotografie master) + un indice di galleria sotto, come ogni pagina
// normale: la pagina SCORRE. Niente scene guidate: le foto parlano.

export function Cover({ go }: { go: GoFn }) {
  const customHeroes = useMemo(() => getAllCustomHeroes(), [])
  const [customHeroIndex, setCustomHeroIndex] = useState(() =>
    customHeroes.length > 0 ? Math.floor(Math.random() * customHeroes.length) : 0
  )
  const { content: driveContent } = useDriveContent()
  const driveHero = driveContent?.hero ?? null

  const [heroFailed, setHeroFailed] = useState(false)
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  useEffect(() => {
    if (reduced || customHeroes.length < 2) return
    const timer = window.setInterval(() => {
      setCustomHeroIndex((current) =>
        moveHeroIndex(current, 1, customHeroes.length)
      )
    }, HERO_ROTATION_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [customHeroes.length, reduced])

  const moveCustomHero = useCallback(
    (direction: number) => {
      setCustomHeroIndex((current) =>
        moveHeroIndex(current, direction, customHeroes.length)
      )
      setHeroFailed(false)
    },
    [customHeroes.length]
  )

  const customHero = customHeroes[customHeroIndex] ?? null

  // Priority order for the full-screen landing banner:
  // 1. Local custom camera master placed in public/hero/ (e.g. hero.jpg)
  // 2. Google Drive hero (hero.jpg or in hero/ folder in root of Drive archive)
  // 3. Latest Instagram photo (fallback to original cover)
  const heroImage = useMemo(() => {
    if (customHero) {
      return {
        src: customHero.src,
        srcSet: undefined,
      }
    }
    if (driveHero) {
      return {
        src: driveHero.displayUrl,
        srcSet: driveHero.srcSet,
      }
    }
    if (featuredEvent) {
      const src = heroFailed
        ? photoUrl(featuredEvent, featuredEvent.cover)
        : photoUrl(featuredEvent, 'hero.jpg')
      return {
        src,
        srcSet: undefined,
      }
    }
    return null
  }, [customHero, driveHero, heroFailed])

  // Card dell'indice: le prime 8 raccolte (quelle con rappresentante valido);
  // con l'archivio vuoto la sezione mostra lo stato vuoto della galleria.
  const homeCards = useMemo(
    () =>
      collections.slice(0, 8).flatMap((col) => {
        const rep = eventById(col.representativeId)
        return rep ? [{ col, rep }] : []
      }),
    []
  )

  return (
    <main>
      <section className="hero">
        <div className="hero-photo">
          {heroImage && (
            <img
              key={customHero ? customHero.name : heroImage.src}
              src={heroImage.src}
              srcSet={heroImage.srcSet}
              sizes={heroImage.srcSet ? '100vw' : undefined}
              alt={DATA.identity.role}
              fetchPriority="high"
              decoding="async"
              onError={() => setHeroFailed(true)}
            />
          )}
        </div>
        <div className="hero-shade" />
        {customHeroes.length > 1 && (
          <div className="hero-carousel" aria-label="Fotografie in evidenza">
            <button
              type="button"
              className="hero-carousel-arrow"
              onClick={() => moveCustomHero(-1)}
              aria-label="Fotografia precedente"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M10 2 4 8l6 6" />
              </svg>
            </button>
            <div className="hero-carousel-count" aria-live="polite">
              {String(customHeroIndex + 1).padStart(2, '0')}
              <span> / {String(customHeroes.length).padStart(2, '0')}</span>
            </div>
            <button
              type="button"
              className="hero-carousel-arrow"
              onClick={() => moveCustomHero(1)}
              aria-label="Fotografia successiva"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M6 2l6 6-6 6" />
              </svg>
            </button>
          </div>
        )}
        <div className="hero-content">
          <div className="hero-role">{DATA.identity.role}</div>
          <h1 className="hero-name">{DATA.identity.name}</h1>
          <div className="hero-location">{DATA.identity.location}</div>
          <div className="hero-cta">
            <button className="btn" onClick={() => go('gallery')}>
              Vedi la galleria
            </button>
            <button className="hero-ghost" onClick={() => go('contact')}>
              Contatti
            </button>
          </div>
        </div>
      </section>

      {/* Indice delle raccolte: le stesse card-marca della galleria (le più
          recenti in testa, come lì) con un link di chiusura. Le categorie
          Drive-only restano nel menu della galleria. */}
      <section className="home-index section" aria-labelledby="home-index-title">
        <div className="container">
          <div className="section-head">
            <h2 id="home-index-title" className="t-h1 home-index-title">Raccolte</h2>
            <div className="t-meta home-index-meta">
              {collections.length} {collections.length === 1 ? 'raccolta' : 'raccolte'} ·{' '}
              {events.reduce((acc, e) => acc + Math.max(1, e.photos.length), 0)} foto
            </div>
          </div>
          <div className="grid-cards">
            {homeCards.length === 0 ? (
              <div className="gl-state" role="status">
                <div className="gl-state-kicker">Galleria</div>
                <p className="gl-state-text t-italic">
                  Nessuna raccolta ancora pubblicata.
                </p>
              </div>
            ) : (
              homeCards.map(({ col, rep }, i) => (
                <Clickable
                  key={col.tag}
                  className="card home-cat"
                  onClick={() => go('story', col.representativeId, col.tag)}
                  aria-label={`Apri la raccolta ${col.tag}`}
                >
                  <div className="card-photo">
                    <img
                      src={photoUrl(rep, rep.cover)}
                      alt={col.tag}
                      loading={i < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                  <div className="card-body">
                    <div>
                      <div className="card-title">{col.tag}</div>
                      {col.desc && <div className="card-sub">{col.desc}</div>}
                    </div>
                    <div className="card-count">{col.n} foto</div>
                  </div>
                </Clickable>
              ))
            )}
          </div>
          <div className="home-links">
            <button className="link-ext" onClick={() => go('videos')}>
              Video →
            </button>
            <button className="link-ext" onClick={() => go('gallery')}>
              Tutte le raccolte →
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
