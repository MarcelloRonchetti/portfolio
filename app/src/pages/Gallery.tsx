import './Gallery.css'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Route } from '../lib/data'
import { DATA } from '../lib/data'
import type { Collection, Event } from '../lib/events'
import type { DrivePhotoCollection } from '../lib/drive'
import {
  events,
  collections,
  eventById,
  firstEventByTag,
  relatedEvents,
  photoUrl,
} from '../lib/events'
import PhotoFrame from '../components/PhotoFrame'
import Clickable from '../components/Clickable'
import { useDialogA11y } from '../hooks/useDialogA11y'
import { formatDate } from '../lib/format'

type GoFn = (next: Route, ref?: string, tag?: string) => void

const pad2 = (n: number) => String(n).padStart(2, '0')

// Fade the photo in only once decoded: data-loaded drives the CSS transition,
// and the ref check covers images already complete from cache before the load
// event could attach.
function markImgLoaded(img: HTMLImageElement | null) {
  if (img && img.complete && img.naturalWidth > 0) img.dataset.loaded = 'true'
}

function CollectionCard({ c, go }: { c: Collection; go: GoFn }) {
  const rep = eventById(c.representativeId)

  return (
    <Clickable
      onClick={() => go('story', c.representativeId, c.tag)}
      className="card gl-card"
    >
      <div className="card-photo">
        {rep && (
          <img
            ref={markImgLoaded}
            src={photoUrl(rep, rep.cover)}
            alt={c.tag}
            loading="lazy"
            decoding="async"
            onLoad={(e) => {
              e.currentTarget.dataset.loaded = 'true'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}
      </div>
      <div className="card-body">
        <div>
          <div className="card-title">{c.tag}</div>
          {c.desc && <div className="card-sub">{c.desc}</div>}
        </div>
        <div className="card-count">{c.n} foto</div>
      </div>
    </Clickable>
  )
}

// Card for a Drive-backed collection: same layout as CollectionCard, image and
// count come straight from the archive listing.
function DriveCollectionCard({ c, go }: { c: DrivePhotoCollection; go: GoFn }) {
  return (
    <Clickable
      onClick={() => go('story', c.id)}
      className="card gl-card"
    >
      <div className="card-photo">
        <img
          ref={markImgLoaded}
          src={c.cover}
          alt={c.title}
          loading="lazy"
          decoding="async"
          onLoad={(e) => {
            e.currentTarget.dataset.loaded = 'true'
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
      <div className="card-body">
        <div>
          <div className="card-title">{c.title}</div>
          {c.date && <div className="card-sub">{c.date.slice(0, 4)}</div>}
        </div>
        <div className="card-count">{c.photos?.length ?? 0} foto</div>
      </div>
    </Clickable>
  )
}

export function Gallery({
  go,
  category,
  categories,
  driveCollections = [],
  driveError = null,
  onDriveRetry,
  onCategory,
}: {
  go: GoFn
  category: string
  categories: string[]
  driveCollections?: DrivePhotoCollection[]
  driveError?: string | null
  onDriveRetry?: () => void
  onCategory: (c: string) => void
}) {
  // App owns the active category (persisted, deep-linkable); Gallery renders it.
  const activeCategory = category
  const catnavRef = useRef<HTMLDivElement>(null)

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

  // Keep the active tab inside the scrollable row — on mobile it is clipped
  // off-screen otherwise, and the hidden scrollbar gives no hint it exists.
  useEffect(() => {
    catnavRef.current
      ?.querySelector<HTMLButtonElement>('[data-active="true"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeCategory])

  // Measure on mount, on scroll and on resize; categories re-runs it because
  // a Drive-only tab can grow the row after the listing arrives. The initial
  // measure is deferred to a frame: it reads the DOM, so it cannot run during
  // render, and the fade appearing one frame later is imperceptible.
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

  const filteredCollections = collections.filter(c => c.category === activeCategory)
  const totalPhotos = events
    .filter(e => e.category === activeCategory)
    .reduce((acc, e) => acc + Math.max(1, e.photos.length), 0) +
    driveCollections.reduce((acc, c) => acc + (c.photos?.length ?? 0), 0)
  const totalCollections = filteredCollections.length + driveCollections.length

  return (
    <main className="section section-dark gl-page">
      <div className="container">
        <div className="section-head">
          <div className="stack gl-head-stack">
            <h1 className="t-h1 gl-head-title">{DATA.gallery.title}</h1>
            <p className="t-italic gl-head-sub">{DATA.gallery.intro}</p>
          </div>
          <div className="t-meta gl-head-meta">
            {totalPhotos} foto · {totalCollections} {totalCollections === 1 ? 'raccolta' : 'raccolte'}
          </div>
        </div>

        {/* A failed refresh keeps the static archive alive; the reason
            surfaces here — Drive-only tabs and collections are the part the
            visitor is silently missing. */}
        {driveError && (
          <div className="gl-notice" role="status">
            <span>{driveError}</span>
            {onDriveRetry && (
              <button className="gl-notice-action" onClick={onDriveRetry}>
                Riprova
              </button>
            )}
          </div>
        )}

        <div className="catnav" ref={catnavRef} data-overflow={catOverflow} role="group" aria-label="Categorie">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onCategory(cat)}
              className="t-meta gl-cat"
              data-active={activeCategory === cat || undefined}
              aria-current={activeCategory === cat ? 'page' : undefined}
            >
              {cat}
            </button>
          ))}
        </div>

        {totalCollections === 0 ? (
          <div className="gl-state" role="status">
            <div className="gl-state-kicker">Galleria</div>
            <p className="gl-state-text t-italic">
              Nessuna raccolta ancora pubblicata in questa categoria.
            </p>
            {categories.length > 1 && (
              <p className="gl-state-hint">Sfoglia le altre categorie dal menu qui sopra.</p>
            )}
          </div>
        ) : (
          <div className="grid-cards">
            {filteredCollections.map((c) => (
              <CollectionCard key={c.tag} c={c} go={go} />
            ))}
            {driveCollections.map((c) => (
              <DriveCollectionCard key={c.id} c={c} go={go} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// Render "Soggetto — Luogo, anno" with the dash in the body serif: Italiana's
// em dash is so thin it reads as a gap. The year binds to the comma so it
// never widows alone on mobile.
function DisplayTitle({ title }: { title: string }) {
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

// Must stay in sync with the lightboxDissolve animation duration in index.css.
const LIGHTBOX_DISSOLVE_MS = 300

export function PhotoStory({
  eventId,
  tag,
  go,
}: {
  eventId: string
  tag?: string
  go: GoFn
}) {
  const direct = eventById(eventId)
  const fallback = firstEventByTag(eventId)
  const f: Event | undefined = direct ?? fallback ?? events[0]
  const [activeIdx, setActiveIdx] = useState(0)
  // 'closing' keeps the overlay mounted while the dissolve-out plays.
  const [lightbox, setLightbox] = useState<'closed' | 'open' | 'closing'>('closed')

  // The hooks below read the photo list (keyboard stepping, prefetch), so it
  // is derived before the early return; with no event the list is empty and
  // every effect no-ops. Memoised because effects depend on its identity.
  const photos = useMemo(
    () => (f && f.photos.length > 0 ? f.photos : f ? [f.cover] : []),
    [f]
  )
  const shownIdx = Math.min(activeIdx, photos.length - 1)
  const activeFile = photos[shownIdx]

  // Stable across renders: the guard reads the state via the functional update.
  const closeLightbox = useCallback(() => {
    setLightbox((prev) => (prev === 'open' ? 'closing' : prev))
  }, [])

  // Remembered at open time so closing can hand keyboard focus back to the
  // frame that opened the lightbox.
  const openerRef = useRef<HTMLElement | null>(null)
  // Horizontal swipe tracking on the lightbox (start x, null when idle).
  const touchX = useRef<number | null>(null)

  const openLightbox = useCallback(() => {
    openerRef.current = document.activeElement as HTMLElement | null
    setLightbox('open')
  }, [])

  // Step with wrap-around; rebound only when the story's photo count changes.
  const stepPhoto = useCallback((dir: 1 | -1) => {
    const n = photos.length
    if (n === 0) return
    setActiveIdx((i) => (i + dir + n) % n)
  }, [photos.length])

  // Drop the overlay once the dissolve-out has played; the cleanup cancels the
  // timer if the story unmounts mid-animation (e.g. a rail hop).
  useEffect(() => {
    if (lightbox !== 'closing') return
    const t = window.setTimeout(() => setLightbox('closed'), LIGHTBOX_DISSOLVE_MS)
    return () => window.clearTimeout(t)
  }, [lightbox])

  // Shared overlay floor: focus in/out, body scroll lock, Escape + arrows,
  // and the Tab trap that keeps aria-modal honest (background inert).
  const dialogRef = useDialogA11y({
    active: lightbox === 'open',
    onClose: closeLightbox,
    onStep: photos.length > 1 ? stepPhoto : undefined,
    openerRef,
  })

  // While browsing, prefetch the neighbours so stepping through feels instant.
  useEffect(() => {
    if (lightbox === 'closed' || !f || photos.length < 2) return
    for (const dir of [1, -1] as const) {
      const img = new Image()
      img.src = photoUrl(f, photos[(activeIdx + dir + photos.length) % photos.length])
    }
  }, [lightbox, activeIdx, photos, f])

  // Rail hops remount this component (App renders it with key={storyId}), so
  // the photo index and the lightbox reset on their own.

  if (!f) {
    return (
      <main className="section section-dark story-state-page">
        <div className="container">
          <div className="gl-state" role="status">
            <div className="gl-state-kicker">Galleria</div>
            <p className="gl-state-text t-italic">Nessun evento disponibile.</p>
            <div className="gl-state-actions">
              <button className="gl-state-action" onClick={() => go('gallery')}>
                ← Torna alla galleria
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Related rail follows the collection the visitor clicked into; entries
  // without a matching tag context (deep links, hero) get the category pool —
  // relatedEvents cascades tag -> category and never widens to all-events. A
  // rail comes out empty only when the whole category has no other event; the
  // aside is then dropped (story-grid-solo reclaims its column).
  const ctxTag = tag && f.tags.includes(tag) ? tag : undefined
  const related = relatedEvents(f.id, { tag: ctxTag, category: f.category })

  return (
    <main className="section section-dark story-page">
      <div className="container">
        <button
          onClick={() => go('gallery', f.category)}
          className="t-meta gl-back"
        >
          ← Galleria
        </button>

        <div className={related.length > 0 ? 'story-grid' : 'story-grid story-grid-solo'}>
          <div className="story-main">
            <PhotoFrame
              event={f}
              file={activeFile}
              alt={f.title}
              caption={{ right: `${pad2(shownIdx + 1)} / ${pad2(photos.length)}` }}
              onClick={openLightbox}
              style={{ cursor: 'zoom-in' }}
            />

            {photos.length > 1 && (
              <div className="thumbstrip">
                {photos.map((file, i) => (
                  <Clickable
                    key={file}
                    onClick={() => setActiveIdx(i)}
                    className="thumb"
                    data-active={i === shownIdx || undefined}
                    aria-current={i === shownIdx ? 'true' : undefined}
                    aria-label={`Foto ${i + 1}`}
                  >
                    <PhotoFrame event={f} file={file} alt={`${f.title} — foto ${i + 1}`} />
                  </Clickable>
                ))}
              </div>
            )}

            <div className="stack" style={{ gap: 10, marginTop: 28 }}>
              <h1 className="t-h1" style={{ margin: 0 }}>
                <DisplayTitle title={f.title} />
              </h1>
              <div className="t-meta" style={{ color: 'var(--accent-inverse)' }}>
                {([
                  formatDate(f.date),
                  f.location && !f.title.toLowerCase().includes(f.location.toLowerCase()) ? f.location : null,
                  !f.title.toLowerCase().includes(f.tag.toLowerCase()) ? f.tag : null,
                ].filter(Boolean) as string[]).join(' · ')}
              </div>
              {f.specs && (
                <div className="t-meta" style={{ color: 'var(--muted-inverse)' }}>{f.specs}</div>
              )}
            </div>

            {f.description_it && (
              <p className="prose" style={{ color: 'var(--muted-inverse)', margin: '18px 0 0' }}>
                {f.description_it}
              </p>
            )}

            {f.links?.instagram_url && (
              <a
                className="link-ext"
                style={{ color: 'var(--ink-inverse)', marginTop: 24, alignSelf: 'flex-start' }}
                href={f.links.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram ↗
              </a>
            )}
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
                    onClick={() => go('story', r.id, ctxTag)}
                    aria-label={`Apri la raccolta ${r.title}`}
                  >
                    <PhotoFrame event={r} file={r.cover} ratio="3 / 2" alt={r.title} />
                    <div className="related-body">
                      <div className="related-title">{r.title}</div>
                      <div className="related-meta">
                        {r.year} · {Math.max(1, r.photos.length)} foto
                      </div>
                    </div>
                  </Clickable>
                ))}
              </div>
              <button className="t-meta related-all" onClick={() => go('gallery', f.category)}>
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
            aria-label={f.title}
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
            {/* L'alt segue la foto mostrata: chi usa un screen reader sente
                la posizione anche se il contatore resta solo visibile... */}
            <img
              src={photoUrl(f, activeFile)}
              alt={photos.length > 1 ? `${f.title} — foto ${shownIdx + 1} di ${photos.length}` : f.title}
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
            {/* ...e il contatore è una live region: ogni passo viene annunciato. */}
            {photos.length > 1 && (
              <div className="lightbox-counter" role="status">
                {pad2(shownIdx + 1)} / {pad2(photos.length)}
              </div>
            )}
          </div>,
          document.body
        )}
      </div>
    </main>
  )
}
