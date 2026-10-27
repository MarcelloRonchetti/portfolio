import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Clickable from '../components/Clickable'
import PhotoFrame from '../components/PhotoFrame'
import { useDriveContent } from '../hooks/useDriveContent'
import type { DrivePhotoCollection } from '../lib/drive'
import type { GoFn } from '../lib/data'
import { formatDate } from '../lib/format'

// Must stay in sync with the lightboxDissolve animation duration in index.css.
const LIGHTBOX_DISSOLVE_MS = 300

const pad2 = (n: number) => String(n).padStart(2, '0')

// Story view for Drive-backed photo collections: same story-grid layout as
// PhotoStory, but the images come straight from the Drive archive (lh3 CDN
// URLs) instead of the bundled photos/ folder. Reached at /story/drive-<id>.
export default function DriveStory({ collectionId, go }: { collectionId: string; go: GoFn }) {
  const { configured, content, loading, error, refresh } = useDriveContent()
  const collections = content?.photoCollections ?? []
  const c: DrivePhotoCollection | undefined = collections.find((x) => x.id === collectionId)

  const [activeIdx, setActiveIdx] = useState(0)
  const [lightbox, setLightbox] = useState<'closed' | 'open' | 'closing'>('closed')

  const closeLightbox = useCallback(() => {
    setLightbox((prev) => (prev === 'open' ? 'closing' : prev))
  }, [])

  useEffect(() => {
    if (lightbox !== 'closing') return
    const t = window.setTimeout(() => setLightbox('closed'), LIGHTBOX_DISSOLVE_MS)
    return () => window.clearTimeout(t)
  }, [lightbox])

  useEffect(() => {
    if (lightbox === 'closed') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, closeLightbox])

  if (!configured) {
    return (
      <main className="section section-dark" style={{ paddingTop: 140, minHeight: '70vh' }}>
        <div className="container">
          <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
            Archivio Drive non collegato.{' '}
            <button onClick={() => go('gallery')} style={{ color: 'var(--accent-inverse)' }}>
              ← Torna alla galleria
            </button>
          </p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="section section-dark" style={{ paddingTop: 140, minHeight: '70vh' }}>
        <div className="container">
          <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
            {error}{' '}
            <button onClick={refresh} style={{ color: 'var(--accent-inverse)' }}>
              Riprova
            </button>{' '}
            ·{' '}
            <button onClick={() => go('gallery')} style={{ color: 'var(--accent-inverse)' }}>
              ← Galleria
            </button>
          </p>
        </div>
      </main>
    )
  }

  if (loading && !content) {
    return (
      <main className="section section-dark" style={{ paddingTop: 140, minHeight: '70vh' }}>
        <div className="container">
          <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
            Caricamento dall'archivio…
          </p>
        </div>
      </main>
    )
  }

  // Listed but not present (deleted folder, stale link) → back to the gallery.
  if (!c) return <Navigate to="/gallery" replace />

  // Related rail mirrors PhotoStory's: newest-first, same category, current
  // excluded, capped like relatedEvents does for local events.
  const related = collections
    .filter((x) => x.category === c.category && x.id !== c.id)
    .slice(0, 12)

  const photos = c.photos
  const active = photos[Math.min(activeIdx, photos.length - 1)]

  return (
    <main className="section section-dark" style={{ paddingTop: 120, paddingBottom: 90 }}>
      <div className="container">
        <button
          onClick={() => go('gallery', c.category)}
          className="t-meta"
          style={{ color: 'var(--muted-inverse)', marginBottom: 26 }}
        >
          ← Galleria
        </button>

        <div className="story-grid">
          <div className="story-main">
            <PhotoFrame
              src={active.fullUrl}
              alt={c.title}
              caption={{ right: `${pad2(activeIdx + 1)} / ${pad2(photos.length)}` }}
              onClick={() => setLightbox('open')}
              style={{ cursor: 'zoom-in' }}
            />

            {photos.length > 1 && (
              <div className="thumbstrip" style={{ marginTop: 12 }}>
                {photos.map((p, i) => (
                  <Clickable
                    key={p.id}
                    onClick={() => setActiveIdx(i)}
                    className="thumb"
                    data-active={i === activeIdx || undefined}
                    aria-label={`Foto ${i + 1}`}
                  >
                    <PhotoFrame src={p.thumbUrl} alt={`${c.title} — foto ${i + 1}`} />
                  </Clickable>
                ))}
              </div>
            )}

            <div className="stack" style={{ gap: 10, marginTop: 28 }}>
              <h1 className="t-h1" style={{ margin: 0 }}>{c.title}</h1>
              <div className="t-meta" style={{ color: 'var(--accent-inverse)' }}>
                {([c.date ? formatDate(c.date) : null, c.category].filter(Boolean) as string[]).join(' · ')}
              </div>
            </div>
          </div>

          <aside className="story-related">
            <h2 className="t-meta" style={{ margin: '0 0 10px', color: 'var(--muted-inverse)' }}>
              Altre raccolte
            </h2>
            <div className="related-list">
              {related.map((r) => (
                <Clickable
                  key={r.id}
                  className="related-item"
                  onClick={() => go('story', r.id)}
                  aria-label={`Apri la raccolta ${r.title}`}
                >
                  <PhotoFrame src={r.cover} ratio="3 / 2" alt={r.title} />
                  <div className="related-body">
                    <div className="related-title">{r.title}</div>
                    <div className="related-meta">
                      {r.date?.slice(0, 4)} · {r.photos.length} foto
                    </div>
                  </div>
                </Clickable>
              ))}
            </div>
            <button className="t-meta related-all" onClick={() => go('gallery', c.category)}>
              Tutte le raccolte →
            </button>
          </aside>
        </div>

        {lightbox !== 'closed' && (
          <div
            className="lightbox"
            data-closing={lightbox === 'closing' || undefined}
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-label={c.title}
          >
            <img src={active.fullUrl} alt={c.title} />
          </div>
        )}
      </div>
    </main>
  )
}
