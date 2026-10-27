import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import type { Route } from '../lib/data'
import { DATA } from '../lib/data'
import type { Collection, Event } from '../lib/events'
import {
  events,
  collections,
  categories,
  eventById,
  firstEventByTag,
  adjacentEvents,
  photoUrl,
} from '../lib/events'
import PhotoFrame from '../components/PhotoFrame'
import Clickable from '../components/Clickable'

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

export function Gallery({
  go,
  category,
  onCategory,
}: {
  go: GoFn
  category: string
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
    .reduce((acc, e) => acc + Math.max(1, e.photos.length), 0)

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
            {totalPhotos} foto · {filteredCollections.length} {filteredCollections.length === 1 ? 'raccolta' : 'raccolte'}
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

        {filteredCollections.length === 0 ? (
          <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
            Nessuna raccolta ancora pubblicata in questa categoria.
          </p>
        ) : (
          <div className="grid-cards">
            {filteredCollections.map((c) => (
              <CollectionCard key={c.tag} c={c} go={go} />
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
  // timer if the story unmounts mid-animation (e.g. a pager hop).
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

  // Pager hops remount this component (App renders it with key={storyId}), so
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

  // Prev/next follow the collection the visitor clicked into; entries without
  // a matching tag context (deep links, hero) fall back to the category pool.
  const ctxTag = tag && f.tags.includes(tag) ? tag : undefined
  const { prev, next } = adjacentEvents(f.id, { tag: ctxTag, category: f.category })
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

        <div className="stack" style={{ gap: 10, marginBottom: 26 }}>
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
          <p className="prose" style={{ color: 'var(--muted-inverse)', margin: '0 0 24px' }}>
            {f.description_it}
          </p>
        )}

        {f.links?.instagram_url && (
          <a
            className="link-ext"
            style={{ color: 'var(--ink-inverse)', marginBottom: 30 }}
            href={f.links.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram ↗
          </a>
        )}

        <PhotoFrame
          event={f}
          file={activeFile}
          alt={f.title}
          caption={{ right: `${String(Math.min(activeIdx, photos.length - 1) + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}` }}
          onClick={() => setLightbox('open')}
          style={{ cursor: 'zoom-in' }}
        />

        {lightbox !== 'closed' && (
          <div
            className="lightbox"
            data-closing={lightbox === 'closing' || undefined}
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-label={f.title}
          >
            <img src={photoUrl(f, activeFile)} alt={f.title} />
          </div>
        )}

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

        <div className="pager">
          <button
            onClick={() => (prev ? go('story', prev.id, ctxTag) : go('gallery', f.category))}
          >
            {prev ? `← ${prev.title}` : '← Galleria'}
          </button>
          <span className="t-meta" style={{ color: 'var(--muted-inverse)' }}>
            {photos.length} foto
          </span>
          <button
            onClick={() => (next ? go('story', next.id, ctxTag) : go('gallery', f.category))}
          >
            {next ? `${next.title} →` : 'Galleria →'}
          </button>
        </div>
      </div>
    </main>
  )
}

function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const months = [
    '', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
  ]
  const day = parseInt(m[3], 10)
  const month = months[parseInt(m[2], 10)] ?? ''
  return `${day} ${month} ${m[1]}`
}
