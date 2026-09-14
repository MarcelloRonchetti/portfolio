import { Fragment, useState } from 'react'
import type { Route } from '../lib/data'
import { DATA } from '../lib/data'
import type { Collection, Event } from '../lib/events'
import {
  events,
  collections,
  eventById,
  firstEventByTag,
  adjacentEvents,
  photoUrl,
} from '../lib/events'
import PhotoFrame from '../components/PhotoFrame'
import Clickable from '../components/Clickable'

type GoFn = (next: Route, ref?: string) => void

function CollectionCard({ c, go }: { c: Collection; go: GoFn }) {
  const rep = eventById(c.representativeId)

  return (
    <Clickable
      onClick={() => go('story', c.representativeId)}
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

export function Gallery({ go }: { go: GoFn }) {
  const totalPhotos = events.reduce((acc, e) => acc + Math.max(1, e.photos.length), 0)

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
            {totalPhotos} foto · {collections.length} raccolte
          </div>
        </div>

        {collections.length === 0 ? (
          <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
            Nessuna raccolta ancora pubblicata.
          </p>
        ) : (
          <div className="grid-cards">
            {collections.map((c) => (
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

export function PhotoStory({ eventId, go }: { eventId: string; go: GoFn }) {
  const direct = eventById(eventId)
  const fallback = firstEventByTag(eventId)
  const f: Event | undefined = direct ?? fallback ?? events[0]
  const [activeIdx, setActiveIdx] = useState(0)

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

  const { prev, next } = adjacentEvents(f.id)
  const photos = f.photos.length > 0 ? f.photos : [f.cover]
  const activeFile = photos[Math.min(activeIdx, photos.length - 1)]

  return (
    <main className="section section-dark" style={{ paddingTop: 120, paddingBottom: 90 }}>
      <div className="container">
        <button
          onClick={() => go('gallery')}
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
          ratio="3 / 2"
          alt={f.title}
          caption={{ right: `${String(Math.min(activeIdx, photos.length - 1) + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}` }}
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

        <div className="pager">
          <button
            onClick={() => (prev ? go('story', prev.id) : go('gallery'))}
            disabled={!prev}
          >
            {prev ? `← ${prev.title}` : '← Galleria'}
          </button>
          <span className="t-meta" style={{ color: 'var(--muted-inverse)' }}>
            {photos.length} foto
          </span>
          <button
            onClick={() => (next ? go('story', next.id) : go('gallery'))}
            disabled={!next}
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
