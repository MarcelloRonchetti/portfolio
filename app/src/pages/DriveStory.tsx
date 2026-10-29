import './Story.css'
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Navigate } from 'react-router-dom'
import Clickable from '../components/Clickable'
import PhotoFrame from '../components/PhotoFrame'
import { useDriveContent } from '../hooks/useDriveContent'
import { useDialogA11y } from '../hooks/useDialogA11y'
import type { DrivePhotoCollection } from '../lib/drive'
import type { GoFn } from '../lib/data'
import { formatDate } from '../lib/format'

// Must stay in sync with the lightboxDissolve animation duration in index.css.
const LIGHTBOX_DISSOLVE_MS = 300

const pad2 = (n: number) => String(n).padStart(2, '0')

// Mirror of Gallery.tsx's DisplayTitle (module-private there): Italiana's em
// dash is nearly invisible — render it in the body serif (.t-dash) — and a
// trailing year stays glued to the title with a no-break space.
function DriveTitle({ title }: { title: string }) {
  const parts = title.split(' — ')
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="t-dash">—</span>}
          {part.replace(/ (\d{4})$/, '\u00A0$1')}
        </Fragment>
      ))}
    </>
  )
}

// State screen for every non-content outcome (not configured, load error,
// loading, empty collection): one editorial block — mono kicker over a serif
// line, mono actions when there is something to do — instead of loose
// paragraphs. role="status" lets screen readers announce what happened.
function StoryState({ variant, kicker, message, children }: {
  variant: 'unconfigured' | 'error' | 'loading' | 'empty'
  kicker: string
  message: string
  children?: ReactNode
}) {
  return (
    <main className="section section-dark story-state-page">
      <div className="container">
        <div className="ds-state" data-variant={variant} role="status">
          <div className="ds-state-kicker">{kicker}</div>
          <p className="ds-state-text t-italic">{message}</p>
          {children && <div className="ds-actions">{children}</div>}
        </div>
      </div>
    </main>
  )
}

// Story view for Drive-backed photo collections: same story-grid layout as
// PhotoStory, but the images come straight from the Drive archive (lh3 CDN
// URLs) instead of the bundled photos/ folder. Reached at /story/drive-<id>.
export default function DriveStory({ collectionId, go }: { collectionId: string; go: GoFn }) {
  const { configured, content, loading, error, refresh } = useDriveContent()
  const collections = content?.photoCollections ?? []
  const c: DrivePhotoCollection | undefined = collections.find((x) => x.id === collectionId)

  const [activeIdx, setActiveIdx] = useState(0)
  const [lightbox, setLightbox] = useState<'closed' | 'open' | 'closing'>('closed')
  // Remembered at open time so closing can hand keyboard focus back to the
  // frame that opened the lightbox; horizontal swipe tracking (start x).
  const openerRef = useRef<HTMLElement | null>(null)
  const touchX = useRef<number | null>(null)

  // The overlay floor and the stepping below only need the photo count (a
  // primitive: stable callback identities); the array itself is plain data.
  const photos = c?.photos ?? []
  const photoCount = photos.length

  const closeLightbox = useCallback(() => {
    setLightbox((prev) => (prev === 'open' ? 'closing' : prev))
  }, [])

  const openLightbox = useCallback(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    setLightbox('open')
  }, [])

  // Step with wrap-around; rebound only when the collection's photo count
  // changes.
  const stepPhoto = useCallback(
    (dir: 1 | -1) => {
      setActiveIdx((i) => (photoCount === 0 ? i : (i + dir + photoCount) % photoCount))
    },
    [photoCount]
  )

  useEffect(() => {
    if (lightbox !== 'closing') return
    const t = window.setTimeout(() => setLightbox('closed'), LIGHTBOX_DISSOLVE_MS)
    return () => window.clearTimeout(t)
  }, [lightbox])

  // Shared overlay floor (same as PhotoStory's lightbox): focus in/out, body
  // scroll lock, Escape, arrows between photos, Tab trap for aria-modal.
  const dialogRef = useDialogA11y({
    active: lightbox === 'open',
    onClose: closeLightbox,
    onStep: photoCount > 1 ? stepPhoto : undefined,
    openerRef,
  })

  if (!configured) {
    return (
      <StoryState variant="unconfigured" kicker="Archivio Drive" message="Archivio non collegato: le raccolte remote non sono disponibili.">
        <button className="ds-action" onClick={() => go('gallery')}>← Torna alla galleria</button>
      </StoryState>
    )
  }

  if (error && !content) {
    return (
      <StoryState variant="error" kicker="Errore" message={error}>
        <button className="ds-action" onClick={refresh}>Riprova</button>
        <button className="ds-action" onClick={() => go('gallery')}>← Torna alla galleria</button>
      </StoryState>
    )
  }

  if (loading && !content) {
    return <StoryState variant="loading" kicker="Archivio Drive" message="Caricamento in corso…" />
  }

  // Listed but not present (deleted folder, stale link) → gallery.
  if (!c) return <Navigate to="/gallery" replace />

  // Listed but empty: an intentional screen instead of a silent redirect.
  if (c.photos.length === 0) {
    return (
      <StoryState variant="empty" kicker="Raccolta vuota" message="Questa raccolta non contiene ancora foto.">
        <button className="ds-action" onClick={() => go('gallery')}>← Torna alla galleria</button>
      </StoryState>
    )
  }

  // Related rail mirrors PhotoStory's: newest-first, same category, current
  // excluded, capped like relatedEvents does for local events.
  const related = collections
    .filter((x) => x.category === c.category && x.id !== c.id)
    .slice(0, 12)

  const active = photos[Math.min(activeIdx, photos.length - 1)]

  return (
    <main className="section section-dark story-page">
      <div className="container">
        <button onClick={() => go('gallery', c.category)} className="t-meta gl-back">
          ← Galleria
        </button>

        {/* A failed refresh keeps the page alive; the reason surfaces here. */}
        {error && (
          <div className="ds-notice" role="status">
            <span>{error}</span>
            <button className="ds-action" onClick={refresh}>Riprova</button>
          </div>
        )}

        {/* Like PhotoStory: a single-collection category drops the aside and
            the media reclaims its column (story-grid-solo). */}
        <div className={related.length > 0 ? 'story-grid' : 'story-grid story-grid-solo'}>
          <div className="story-main">
            <PhotoFrame
              src={active.fullUrl}
              alt={c.title}
              caption={{ right: `${pad2(activeIdx + 1)} / ${pad2(photos.length)}` }}
              onClick={openLightbox}
              style={{ cursor: 'zoom-in' }}
            />

            {photos.length > 1 && (
              <div className="thumbstrip">
                {photos.map((p, i) => (
                  <Clickable
                    key={p.id}
                    onClick={() => setActiveIdx(i)}
                    className="thumb"
                    data-active={i === activeIdx || undefined}
                    aria-current={i === activeIdx ? 'true' : undefined}
                    aria-label={`Foto ${i + 1}`}
                  >
                    <PhotoFrame src={p.thumbUrl} alt={`${c.title} — foto ${i + 1}`} />
                  </Clickable>
                ))}
              </div>
            )}

            <div className="stack" style={{ gap: 10, marginTop: 28 }}>
              <h1 className="t-h1" style={{ margin: 0 }}><DriveTitle title={c.title} /></h1>
              <div className="t-meta" style={{ color: 'var(--accent-inverse)' }}>
                {([c.date ? formatDate(c.date) : null, c.category].filter(Boolean) as string[]).join(' · ')}
              </div>
            </div>
          </div>

          {related.length > 0 && (
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
          )}
        </div>

        {/* Portal to <body>: the page-fade wrapper keeps a transform, which
            would make this fixed lightbox center on the document, not the
            viewport. Backdrop click closes; arrows and swipe step through. */}
        {lightbox !== 'closed' && createPortal(
          <div
            className="lightbox"
            data-closing={lightbox === 'closing' || undefined}
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-label={c.title}
            ref={dialogRef}
            tabIndex={-1}
            onTouchStart={(e) => {
              touchX.current = e.touches[0].clientX
            }}
            onTouchEnd={(e) => {
              const x0 = touchX.current
              touchX.current = null
              if (x0 === null) return
              const dx = e.changedTouches[0].clientX - x0
              if (Math.abs(dx) > 48) stepPhoto(dx < 0 ? 1 : -1)
            }}
          >
            {photos.length > 1 && (
              <button
                className="lightbox-nav lightbox-nav-prev"
                aria-label="Foto precedente"
                onClick={(e) => {
                  e.stopPropagation()
                  stepPhoto(-1)
                }}
              >
                ←
              </button>
            )}
            {/* Alt e contatore parlano la posizione, come in PhotoStory. */}
            <img
              src={active.fullUrl}
              alt={photos.length > 1 ? `${c.title} — foto ${activeIdx + 1} di ${photos.length}` : c.title}
            />
            {photos.length > 1 && (
              <button
                className="lightbox-nav lightbox-nav-next"
                aria-label="Foto successiva"
                onClick={(e) => {
                  e.stopPropagation()
                  stepPhoto(1)
                }}
              >
                →
              </button>
            )}
            {photos.length > 1 && (
              <div className="lightbox-counter" role="status">
                {pad2(activeIdx + 1)} / {pad2(photos.length)}
              </div>
            )}
          </div>,
          document.body
        )}
      </div>
    </main>
  )
}
