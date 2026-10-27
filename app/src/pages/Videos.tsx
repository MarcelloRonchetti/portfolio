import { useEffect, useRef, useState } from 'react'
import Clickable from '../components/Clickable'
import { useDriveContent } from '../hooks/useDriveContent'
import type { DriveVideo } from '../lib/drive'
import { DRIVE_CONFIG } from '../lib/driveConfig'

const ALL = 'Tutti'

// 83000 → "1:23", 725000 → "12:05" (minutes unbounded: 75:00 for long clips).
function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function VideoCard({ v, onPlay }: { v: DriveVideo; onPlay: (v: DriveVideo) => void }) {
  return (
    <Clickable className="card" onClick={() => onPlay(v)}>
      <div className="card-photo">
        <img
          src={v.posterUrl}
          alt={v.title}
          loading="lazy"
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
  const [activeCategory, setActiveCategory] = useState(ALL)
  const [playing, setPlaying] = useState<DriveVideo | null>(null)
  const [playError, setPlayError] = useState(false)
  const catnavRef = useRef<HTMLDivElement>(null)

  const videos = content?.videos ?? []
  const categories = Array.from(new Set(videos.map((v) => v.category))).sort((a, b) =>
    a.localeCompare(b)
  )
  const filtered =
    activeCategory === ALL ? videos : videos.filter((v) => v.category === activeCategory)

  const openPlayer = (v: DriveVideo) => {
    setPlaying(v)
    setPlayError(false)
  }
  const close = () => setPlaying(null)

  // Keep the active tab inside the scrollable row — same as Gallery, on mobile
  // the hidden scrollbar gives no hint the row exists.
  useEffect(() => {
    catnavRef.current
      ?.querySelector<HTMLButtonElement>('[data-active="true"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeCategory])

  // Esc closes the player; the listener drops with the overlay.
  useEffect(() => {
    if (!playing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlaying(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playing])

  // Scroll lock while the player is open; restored on close and on unmount.
  useEffect(() => {
    if (!playing) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [playing])

  return (
    <main className="section section-dark" style={{ paddingTop: 120, paddingBottom: 90 }}>
      <div className="container">
        <div className="section-head">
          <div className="stack" style={{ gap: 6 }}>
            <h1 className="t-h1" style={{ margin: 0 }}>Video</h1>
            <p className="t-italic" style={{ margin: 0, color: 'var(--muted-inverse)', fontSize: 18 }}>
              Momentum in movimento — i filmati dell'archivio, in qualità HD.
            </p>
          </div>
          <div className="t-meta" style={{ color: 'var(--muted-inverse)' }}>
            {content
              ? `${filtered.length} video · qualità min. ${DRIVE_CONFIG.minVideoHeight}p`
              : `qualità min. ${DRIVE_CONFIG.minVideoHeight}p`}
          </div>
        </div>

        <div className="catnav" ref={catnavRef}>
          {[ALL, ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="t-meta"
              data-active={activeCategory === cat || undefined}
              aria-pressed={activeCategory === cat}
              style={{
                color: activeCategory === cat ? 'var(--accent-inverse)' : 'var(--muted-inverse)',
                borderBottom: activeCategory === cat ? '1px solid var(--accent-inverse)' : '1px solid transparent',
                paddingBottom: '4px',
                transition: 'color 0.2s, border-color 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {!configured ? (
          <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
            Archivio video in preparazione — la sezione verrà collegata all'archivio Drive a breve.
          </p>
        ) : loading && !content ? (
          <div className="grid-cards">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="card skeleton-card">
                <div className="skeleton-block" />
              </div>
            ))}
          </div>
        ) : error && !content ? (
          <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
            {error}
            <button
              className="t-meta"
              style={{ color: 'var(--accent-inverse)', marginLeft: 12 }}
              onClick={refresh}
            >
              Riprova
            </button>
          </p>
        ) : filtered.length === 0 && !error ? (
          <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
            Nessun video in questa categoria.
          </p>
        ) : (
          <>
            {error && content && (
              <p className="t-meta" style={{ color: 'var(--muted-inverse)', marginBottom: 18 }}>
                {error}{' '}
                <button
                  className="t-meta"
                  style={{ color: 'var(--accent-inverse)' }}
                  onClick={refresh}
                >
                  Riprova
                </button>
              </p>
            )}
            <div className="grid-cards">
              {filtered.map((v) => (
                <VideoCard key={v.id} v={v} onPlay={openPlayer} />
              ))}
            </div>
          </>
        )}

        {playing && (
          <div
            className="video-lightbox"
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label={playing.title}
          >
            <button className="video-lightbox-close" onClick={close} aria-label="Chiudi il video" autoFocus>
              ✕
            </button>
            <div className="video-lightbox-inner" onClick={(e) => e.stopPropagation()}>
              <div className="t-meta" style={{ color: 'var(--ink-inverse)', marginBottom: 12 }}>
                {playing.title} · {playing.qualityLabel}
              </div>
              {playError ? (
                <p className="t-italic" style={{ color: 'var(--ink-inverse)' }}>
                  Questo video non è più disponibile nell'archivio (forse è stato rimosso o
                  sostituito).{' '}
                  <button
                    className="t-meta"
                    style={{ color: 'var(--accent-inverse)' }}
                    onClick={() => {
                      close()
                      refresh()
                    }}
                  >
                    Aggiorna l'elenco
                  </button>
                </p>
              ) : (
                <video
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  poster={playing.posterLg}
                  src={playing.streamUrl}
                  onError={() => setPlayError(true)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
