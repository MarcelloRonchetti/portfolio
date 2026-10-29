import './Videos.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Clickable from '../components/Clickable'
import { useDriveContent } from '../hooks/useDriveContent'
import { useDialogA11y } from '../hooks/useDialogA11y'
import type { DriveVideo } from '../lib/drive'

// The page opens on the car archive; there is deliberately no "Tutti" tab.
const DEFAULT_CATEGORY = 'Varie'

// Must stay in sync with the lightboxDissolve duration in Videos.css.
const LIGHTBOX_DISSOLVE_MS = 300

// 83000 → "1:23", 725000 → "12:05" (minutes unbounded: 75:00 for long clips).
function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// Fade the poster in only once decoded: data-loaded drives the CSS transition,
// and the ref check covers posters already complete from cache before the load
// event could attach (same pattern as Gallery).
function markImgLoaded(img: HTMLImageElement | null) {
  if (img && img.complete && img.naturalWidth > 0) img.dataset.loaded = 'true'
}

function VideoCard({ v, onPlay }: { v: DriveVideo; onPlay: (v: DriveVideo) => void }) {
  return (
    <Clickable className="card vl-card" onClick={() => onPlay(v)}>
      <div className="card-photo">
        <img
          ref={markImgLoaded}
          src={v.posterUrl}
          alt={v.title}
          loading="lazy"
          decoding="async"
          onLoad={(e) => {
            e.currentTarget.dataset.loaded = 'true'
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        <div className="video-play" aria-hidden="true">▷</div>
        {v.durationMs != null && (
          <div className="video-duration">{formatDuration(v.durationMs)}</div>
        )}
      </div>
      <div className="card-body">
        <div className="card-title">{v.title}</div>
        <div className="card-sub">{v.category}</div>
        <div className="card-count">{v.qualityLabel}</div>
      </div>
    </Clickable>
  )
}

export default function Videos() {
  const { configured, content, loading, error, refresh } = useDriveContent()
  const [activeCategory, setActiveCategory] = useState(DEFAULT_CATEGORY)
  const [playing, setPlaying] = useState<DriveVideo | null>(null)
  // 'closing' keeps the overlay mounted while the dissolve-out plays.
  const [lightbox, setLightbox] = useState<'closed' | 'open' | 'closing'>('closed')
  const [playError, setPlayError] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const catnavRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  // Remembered at open time so closing can hand keyboard focus back to the
  // card that opened the player (autoFocus on the close button covers the
  // way in).
  const openerRef = useRef<HTMLElement | null>(null)

  // Edge fades for the scrollable tab row: "left" / "right" / "both" say
  // which sides still have hidden content; undefined means everything fits.
  const [catOverflow, setCatOverflow] = useState<'left' | 'right' | 'both' | undefined>(undefined)

  const updateCatOverflow = useCallback(() => {
    const el = catnavRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    if (max <= 1) {
      setCatOverflow(undefined)
      return
    }
    const left = el.scrollLeft > 1
    const right = el.scrollLeft < max - 1
    setCatOverflow(left && right ? 'both' : left ? 'left' : right ? 'right' : undefined)
  }, [])

  const videos = useMemo(() => content?.videos ?? [], [content])
  const categories = useMemo(
    () => Array.from(new Set(videos.map((v) => v.category))).sort((a, b) => a.localeCompare(b)),
    [videos]
  )
  // Keep the selection valid across listing refreshes: a category that
  // disappeared falls back to the first available tab.
  const active = categories.includes(activeCategory) ? activeCategory : categories[0]
  const filtered = active ? videos.filter((v) => v.category === active) : []

  const openPlayer = (v: DriveVideo) => {
    openerRef.current = document.activeElement as HTMLElement | null
    setPlaying(v)
    setPlayError(false)
    setBuffering(true)
    setLightbox('open')
  }

  const closePlayer = useCallback(() => {
    // The dissolve keeps the <video> mounted for LIGHTBOX_DISSOLVE_MS: pause
    // it right away so the audio doesn't outlive the click.
    videoRef.current?.pause()
    setLightbox((prev) => (prev === 'open' ? 'closing' : prev))
  }, [])

  // Drop the overlay once the dissolve-out has played; the cleanup cancels
  // the timer if the page unmounts mid-animation.
  useEffect(() => {
    if (lightbox !== 'closing') return
    const t = window.setTimeout(() => {
      setPlaying(null)
      setLightbox('closed')
    }, LIGHTBOX_DISSOLVE_MS)
    return () => window.clearTimeout(t)
  }, [lightbox])

  // Keep the active tab inside the scrollable row — same as Gallery, on mobile
  // the hidden scrollbar gives no hint the row exists. categories re-runs it
  // because the row renders only once the listing has arrived.
  useEffect(() => {
    catnavRef.current
      ?.querySelector<HTMLButtonElement>('[data-active="true"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeCategory, categories])

  // Measure on mount, on scroll and on resize; a new listing re-runs it
  // because the tabs it brings can grow the row. The initial measure is
  // deferred to a frame: it reads the DOM, so it cannot run during render.
  useEffect(() => {
    const el = catnavRef.current
    if (!el) return
    const raf = requestAnimationFrame(updateCatOverflow)
    el.addEventListener('scroll', updateCatOverflow, { passive: true })
    const ro = new ResizeObserver(updateCatOverflow)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', updateCatOverflow)
      ro.disconnect()
    }
  }, [updateCatOverflow, categories])

  // Shared overlay floor: focus in/out (the close button's autoFocus wins on
  // the way in), body scroll lock, Escape and the Tab trap that keeps
  // aria-modal honest.
  const dialogRef = useDialogA11y({
    active: lightbox === 'open' && playing !== null,
    onClose: closePlayer,
    openerRef,
  })

  return (
    <main className="section section-dark vl-page">
      <div className="container">
        <div className="section-head">
          <div className="stack vl-head-stack">
            <h1 className="t-h1 vl-head-title">Video</h1>
            <p className="t-italic vl-head-sub">
              Momentum in movimento — i filmati dell'archivio, in qualità HD.
            </p>
          </div>
          {content && (
            <div className="t-meta vl-head-meta">
              {filtered.length} video
            </div>
          )}
        </div>

        {categories.length > 0 && (
          <div className="catnav" ref={catnavRef} data-overflow={catOverflow} role="group" aria-label="Categorie">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="t-meta vl-cat"
                data-active={active === cat || undefined}
                aria-pressed={active === cat}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {!configured ? (
          <div className="vl-state" role="status">
            <div className="vl-state-kicker">Archivio video</div>
            <p className="vl-state-text t-italic">
              Archivio video in preparazione: la sezione verrà collegata all'archivio Drive a breve.
            </p>
          </div>
        ) : loading && !content ? (
          <div role="status">
            <span className="vl-sr-only">Caricamento dell'archivio video…</span>
            <div className="grid-cards">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="card skeleton-card">
                  <div className="skeleton-block" />
                  <div className="skeleton-line" />
                </div>
              ))}
            </div>
          </div>
        ) : error && !content ? (
          <div className="vl-state" data-variant="error" role="status">
            <div className="vl-state-kicker">Errore</div>
            <p className="vl-state-text t-italic">{error}</p>
            <div className="vl-actions">
              <button className="vl-action" onClick={refresh}>Riprova</button>
            </div>
          </div>
        ) : filtered.length === 0 && !error ? (
          <div className="vl-state" role="status">
            <div className="vl-state-kicker">Archivio video</div>
            <p className="vl-state-text t-italic">
              {videos.length === 0
                ? "L'archivio non contiene ancora video."
                : 'Nessun video in questa categoria.'}
            </p>
            <div className="vl-actions">
              <button className="vl-action" onClick={refresh}>Riprova</button>
            </div>
          </div>
        ) : (
          <>
            {/* A failed refresh keeps the page alive; the reason surfaces here. */}
            {error && content && (
              <div className="vl-notice" role="status">
                <span>{error}</span>
                <button className="vl-action" onClick={refresh}>Riprova</button>
              </div>
            )}
            <div className="grid-cards">
              {filtered.map((v) => (
                <VideoCard key={v.id} v={v} onPlay={openPlayer} />
              ))}
            </div>
          </>
        )}

        {/* Portal to <body>: .page-fade keeps a transform (fill-mode: both),
            and a transformed ancestor becomes the containing block for
            position:fixed — without the portal the player centers on the whole
            document (off-screen) instead of the viewport. Backdrop click and
            Escape close; autoFocus lands on the close button. */}
        {lightbox !== 'closed' && playing && createPortal(
          <div
            className="video-lightbox"
            data-closing={lightbox === 'closing' || undefined}
            onClick={closePlayer}
            role="dialog"
            aria-modal="true"
            aria-label={playing.title}
            ref={dialogRef}
            tabIndex={-1}
          >
            <button
              className="video-lightbox-close"
              onClick={closePlayer}
              aria-label="Chiudi il video"
              autoFocus
            >
              ✕
            </button>
            <div className="video-lightbox-inner" onClick={(e) => e.stopPropagation()}>
              <div className="vl-player-meta t-meta">
                {playing.title} · {playing.qualityLabel}
              </div>
              {playError ? (
                <div className="vl-player-error">
                  <p className="vl-player-error-text t-italic">
                    Questo video non è più disponibile nell'archivio: forse è stato rimosso o
                    sostituito.
                  </p>
                  <div className="vl-actions">
                    <button className="vl-action" onClick={() => { closePlayer(); refresh() }}>
                      Aggiorna l'elenco
                    </button>
                  </div>
                </div>
              ) : (
                <div className="vl-player-stage">
                  <video
                    ref={videoRef}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    poster={playing.posterLg}
                    src={playing.streamUrl}
                    onError={() => setPlayError(true)}
                    onWaiting={() => setBuffering(true)}
                    onPlaying={() => setBuffering(false)}
                    onCanPlay={() => setBuffering(false)}
                  />
                  {buffering && (
                    <div className="vl-player-loading" role="status">
                      <span>Caricamento…</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </main>
  )
}
