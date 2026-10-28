import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
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
import { formatDate } from '../lib/format'

type GoFn = (next: Route, ref?: string, tag?: string) => void

function CollectionCard({ c, go }: { c: Collection; go: GoFn }) {
  const rep = eventById(c.representativeId)

  return (
    <Clickable
      onClick={() => go('story', c.representativeId, c.tag)}
      className="card"
    >
      <div className="card-photo">
        {rep && (
          <img
            src={photoUrl(rep, rep.cover)}
            alt={c.tag}
            loading="lazy"
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
      className="card"
    >
      <div className="card-photo">
        <img
          src={c.cover}
          alt={c.title}
          loading="lazy"
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
  onCategory,
}: {
  go: GoFn
  category: string
  categories: string[]
  driveCollections?: DrivePhotoCollection[]
  onCategory: (c: string) => void
}) {
  // App owns the active category (persisted, deep-linkable); Gallery renders it.
  const activeCategory = category
  const catnavRef = useRef<HTMLDivElement>(null)

  // Keep the active tab inside the scrollable row — on mobile it is clipped
  // off-screen otherwise, and the hidden scrollbar gives no hint it exists.
  useEffect(() => {
    catnavRef.current
      ?.querySelector<HTMLButtonElement>('[data-active="true"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeCategory])

  const filteredCollections = collections.filter(c => c.category === activeCategory)
  const totalPhotos = events
    .filter(e => e.category === activeCategory)
    .reduce((acc, e) => acc + Math.max(1, e.photos.length), 0) +
    driveCollections.reduce((acc, c) => acc + (c.photos?.length ?? 0), 0)
  const totalCollections = filteredCollections.length + driveCollections.length

  return (
    <main className="section section-dark" style={{ paddingTop: 120, paddingBottom: 90 }}>
      <div className="container">
        <div className="section-head">
          <div className="stack" style={{ gap: 6 }}>
            <h1 className="t-h1" style={{ margin: 0 }}>{DATA.gallery.title}</h1>
            <p className="t-italic" style={{ margin: 0, color: 'var(--muted-inverse)', fontSize: 18 }}>
              {DATA.gallery.intro}
            </p>
          </div>
          <div className="t-meta" style={{ color: 'var(--muted-inverse)' }}>
            {totalPhotos} foto · {totalCollections} {totalCollections === 1 ? 'raccolta' : 'raccolte'}
          </div>
        </div>

        <div className="catnav" ref={catnavRef}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onCategory(cat)}
              className="t-meta"
              data-active={activeCategory === cat || undefined}
              aria-current={activeCategory === cat ? 'page' : undefined}
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

        {totalCollections === 0 ? (
          <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
            Nessuna raccolta ancora pubblicata in questa categoria.
          </p>
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

  // Stable across renders: the guard reads the state via the functional update.
  const closeLightbox = useCallback(() => {
    setLightbox((prev) => (prev === 'open' ? 'closing' : prev))
  }, [])

  // Drop the overlay once the dissolve-out has played; the cleanup cancels the
  // timer if the story unmounts mid-animation (e.g. a rail hop).
  useEffect(() => {
    if (lightbox !== 'closing') return
    const t = window.setTimeout(() => setLightbox('closed'), LIGHTBOX_DISSOLVE_MS)
    return () => window.clearTimeout(t)
  }, [lightbox])

  // Esc closes, as in any lightbox; the listener drops when the overlay does.
  useEffect(() => {
    if (lightbox === 'closed') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, closeLightbox])

  // Rail hops remount this component (App renders it with key={storyId}), so
  // the photo index and the lightbox reset on their own.

  if (!f) {
    return (
      <main className="section section-dark" style={{ paddingTop: 140, minHeight: '70vh' }}>
        <div className="container">
          <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
            Nessun evento disponibile.{' '}
            <button onClick={() => go('gallery')} style={{ color: 'var(--accent-inverse)' }}>
              ← Torna alla galleria
            </button>
          </p>
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
  const photos = f.photos.length > 0 ? f.photos : [f.cover]
  const activeFile = photos[Math.min(activeIdx, photos.length - 1)]

  return (
    <main className="section section-dark" style={{ paddingTop: 120, paddingBottom: 90 }}>
      <div className="container">
        <button
          onClick={() => go('gallery', f.category)}
          className="t-meta"
          style={{ color: 'var(--muted-inverse)', marginBottom: 26 }}
        >
          ← Galleria
        </button>

        <div className={related.length > 0 ? 'story-grid' : 'story-grid story-grid-solo'}>
          <div className="story-main">
            <PhotoFrame
              event={f}
              file={activeFile}
              alt={f.title}
              caption={{ right: `${String(Math.min(activeIdx, photos.length - 1) + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}` }}
              onClick={() => setLightbox('open')}
              style={{ cursor: 'zoom-in' }}
            />

            {photos.length > 1 && (
              <div className="thumbstrip" style={{ marginTop: 12 }}>
                {photos.map((file, i) => (
                  <Clickable
                    key={file}
                    onClick={() => setActiveIdx(i)}
                    className="thumb"
                    data-active={i === activeIdx || undefined}
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
            would make this fixed lightbox center on the document, not the viewport. */}
        {lightbox !== 'closed' && createPortal(
          <div
            className="lightbox"
            data-closing={lightbox === 'closing' || undefined}
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-label={f.title}
          >
            <img src={photoUrl(f, activeFile)} alt={f.title} />
          </div>,
          document.body
        )}
      </div>
    </main>
  )
}

