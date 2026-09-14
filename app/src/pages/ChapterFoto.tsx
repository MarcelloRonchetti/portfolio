import { Fragment, useState } from 'react'
import type { Route } from '../lib/data'
import { DATA, ROUTE_META } from '../lib/data'
import type { Event } from '../lib/events'
import {
  events,
  collections,
  featuredEvent,
  eventById,
  firstEventByTag,
  adjacentEvents,
} from '../lib/events'
import PhotoFrame from '../components/PhotoFrame'
import Clickable from '../components/Clickable'

type GoFn = (next: Route, ref?: string) => void

function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-cursor="lg"
      data-cursor-label="APRI"
      onClick={(e) => e.stopPropagation()}
      className="t-meta pill"
    >
      {label}
    </a>
  )
}

function CollectionCard({
  c,
  onClick,
}: {
  c: (typeof collections)[number]
  onClick: () => void
}) {
  const hasLinks = !!(c.links?.instagram_url || c.links?.gallery_url || c.links?.external_url)

  return (
    <Clickable
      onClick={onClick}
      cursor="xl"
      cursorLabel="APRI"
      className="hover-card"
      style={{
        position: 'relative',
        border: 'var(--hair) solid var(--brass)',
        padding: '20px 22px 22px',
        minHeight: 260,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          position: 'absolute',
          right: -18,
          bottom: -32,
          fontFamily: 'Italiana, serif',
          fontSize: 200,
          letterSpacing: 0,
          color: 'var(--brass)',
          opacity: 0.12,
          lineHeight: 0.8,
          pointerEvents: 'none',
        }}
      >
        {c.no}
      </span>

      <div>
        <div className="t-meta" style={{ color: 'var(--brass)', opacity: 0.85 }}>
          RACCOLTA · {c.no}
        </div>
        <div className="t-display" style={{ fontSize: 'clamp(36px, 3.6vw, 56px)', marginTop: 10 }}>
          {c.tag}
        </div>
      </div>

      <div>
        <div className="t-italic" style={{ fontSize: 17, opacity: 0.8 }}>{c.desc}</div>
        <hr className="hr-brass" style={{ margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="t-italic" style={{ fontSize: 22, color: 'var(--brass)' }}>{c.n} scatti</span>
          <span className="t-meta" style={{ opacity: 0.65 }}>sfoglia →</span>
        </div>
        {hasLinks && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {c.links?.instagram_url && <LinkPill href={c.links.instagram_url} label="IG" />}
            {c.links?.gallery_url && <LinkPill href={c.links.gallery_url} label="GALLERIA" />}
            {c.links?.external_url && <LinkPill href={c.links.external_url} label="↗" />}
          </div>
        )}
      </div>
    </Clickable>
  )
}

// Teaser for the Selezioni list: first caption sentence, mentions stripped,
// falling back to the location.
function teaser(e: Event): string {
  const first = e.description_it
    ?.split(/[.\n]/)[0]
    ?.replace(/@[\w.]+/g, '')
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/gu, '')
    .trim()
  return first || e.location || ''
}

export function ChapterFoto({ go }: { go: GoFn }) {
  const f = featuredEvent
  const totalShots = events.reduce((acc, e) => acc + e.photos.length + 1, 0)
  const selezioni = events.filter((e) => !f || e.id !== f.id).slice(0, 6)

  return (
    <section
      className="page dark-grain"
      style={{
        background: 'var(--ink-deep)',
        color: 'var(--ivory)',
        paddingBottom: 80,
        minHeight: '100vh',
      }}
    >
      <div style={{ position: 'relative', height: 'min(95vh, 900px)' }}>
        {f ? (
          <PhotoFrame event={f} file={f.cover} ratio="auto" dark>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,12,9,.42)', zIndex: 2 }} />
            <HeroOverlay event={f} totalShots={totalShots} />
          </PhotoFrame>
        ) : (
          <div className="frame dark" style={{ position: 'absolute', inset: 0 }}>
            <HeroOverlay event={undefined} totalShots={totalShots} />
          </div>
        )}
      </div>

      <div
        style={{
          padding: '80px var(--gutter)',
          background: 'var(--ink-deep)',
          borderTop: 'var(--hair) solid var(--brass)',
          borderBottom: 'var(--hair) solid var(--brass)',
        }}
      >
        <div style={{ maxWidth: '64ch', margin: '0 auto', textAlign: 'center' }}>
          <span className="t-display" style={{ fontSize: 'clamp(36px, 3vw, 56px)', color: 'var(--brass)' }}>
            “
          </span>
          <div
            className="t-italic"
            style={{
              fontSize: 'clamp(28px, 3vw, 44px)',
              lineHeight: 1.3,
              color: 'var(--ivory)',
              marginTop: -10,
            }}
          >
            {DATA.foto_chapter.pull_quote}
          </div>
          <div className="t-meta" style={{ color: 'var(--brass)', marginTop: 24 }}>
            — M.R., DAL DIARIO DI BORDO
          </div>
        </div>
      </div>

      <div style={{ padding: '100px var(--gutter) 60px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 18,
          }}
        >
          <div>
            <div className="t-meta" style={{ color: 'var(--brass)' }}>II — RACCOLTE</div>
            <h2 className="t-display" style={{ fontSize: 'clamp(40px, 5vw, 80px)', margin: '8px 0 0' }}>
              Le stagioni
            </h2>
          </div>
          <div className="t-italic" style={{ fontSize: 20, opacity: 0.65 }}>
            {collections.length === 0 ? 'nessuna raccolta ancora' : `${collections.length} capitoli, una stagione viva`}
          </div>
        </div>
        <hr className="hr-brass" />

        {collections.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 24,
              marginTop: 40,
            }}
          >
            {collections.map((c) => (
              <CollectionCard
                key={c.tag}
                c={c}
                onClick={() => go('story', c.representativeId)}
              />
            ))}
          </div>
        )}
      </div>

      {selezioni.length > 0 && (
        <div style={{ padding: '60px var(--gutter) 80px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: 28,
            }}
          >
            <div>
              <div className="t-meta" style={{ color: 'var(--brass)' }}>II·b — STORIE SCELTE</div>
              <h2 className="t-display" style={{ fontSize: 'clamp(40px, 5vw, 80px)', margin: '8px 0 0' }}>
                Selezioni
              </h2>
            </div>
          </div>
          <hr className="hr-brass" />

          <div style={{ marginTop: 28 }}>
            {selezioni.map((s, i) => (
              <Clickable
                key={s.id}
                onClick={() => go('story', s.id)}
                cursor="xl"
                cursorLabel="LEGGI"
                className="hover-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 140px 1fr 2fr 60px',
                  padding: '26px 0',
                  alignItems: 'baseline',
                  gap: 24,
                  borderBottom: 'var(--hair) solid var(--brass-a30)',
                }}
              >
                <span className="t-meta" style={{ opacity: 0.55 }}>0{i + 1}</span>
                <span className="t-meta" style={{ opacity: 0.8, color: 'var(--brass)' }}>{s.tag}</span>
                <span className="t-display" style={{ fontSize: 'clamp(28px, 2.4vw, 40px)' }}>
                  {s.title} '{s.year.slice(-2)}
                </span>
                <span className="t-italic" style={{ fontSize: 18, opacity: 0.8 }}>
                  {teaser(s)}
                </span>
                <span className="t-meta" style={{ opacity: 0.55, textAlign: 'right', color: 'var(--brass)' }}>
                  '{s.year.slice(-2)}
                </span>
              </Clickable>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function HeroOverlay({ event, totalShots }: { event?: Event; totalShots: number }) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 'var(--gutter)',
          top: 200,
          zIndex: 3,
          animationName: 'riseFade',
          animationDuration: '1.2s',
          animationTimingFunction: 'cubic-bezier(.22,.61,.36,1)',
          animationFillMode: 'both',
          animationDelay: '.4s',
        }}
      >
        <div className="t-meta" style={{ color: 'var(--brass)' }}>
          CAPITOLO SECONDO · IL FOTOGRAFO
        </div>
        <div
          className="t-display"
          style={{
            fontSize: 'clamp(80px, 12vw, 220px)',
            marginTop: 18,
            color: 'var(--ivory)',
            whiteSpace: 'nowrap',
          }}
        >
          LA LENTE
        </div>
        <div
          className="t-italic"
          style={{
            fontSize: 'clamp(22px, 1.8vw, 28px)',
            marginTop: 18,
            opacity: 0.85,
            maxWidth: '32ch',
          }}
        >
          {DATA.foto_chapter.intro}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 'var(--gutter)',
          top: 200,
          zIndex: 3,
          textAlign: 'right',
          animationName: 'riseFade',
          animationDuration: '1.2s',
          animationTimingFunction: 'cubic-bezier(.22,.61,.36,1)',
          animationFillMode: 'both',
          animationDelay: '.6s',
        }}
      >
        <div className="t-meta" style={{ color: 'var(--brass)' }}>SHOT COUNT</div>
        <div
          className="t-display"
          style={{
            fontSize: 'clamp(64px, 7vw, 124px)',
            color: 'var(--ivory)',
            marginTop: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {totalShots.toLocaleString('it-IT')}
        </div>
        <div className="t-italic" style={{ fontSize: 18, opacity: 0.75 }}>
          dal {DATA.foto_chapter.since} — {DATA.identity.year}
        </div>
      </div>

      {event && (
        <div
          style={{
            position: 'absolute',
            left: 'var(--gutter)',
            right: 'var(--gutter)',
            bottom: 36,
            zIndex: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 36,
            animationName: 'riseFade',
            animationDuration: '1.2s',
            animationTimingFunction: 'cubic-bezier(.22,.61,.36,1)',
            animationFillMode: 'both',
            animationDelay: '.8s',
          }}
        >
          <div>
            <div className="t-meta" style={{ color: 'var(--brass)', marginBottom: 6 }}>
              {event.subtitle ? `FEATURED · ${event.subtitle.toUpperCase()}` : 'FEATURED'}
            </div>
            <div
              className="t-display"
              style={{
                fontSize: 'clamp(40px, 5vw, 78px)',
                color: 'var(--ivory)',
                whiteSpace: 'nowrap',
              }}
            >
              {event.title.toUpperCase()} '{event.year.slice(-2)}
            </div>
          </div>
          {(event.location || event.specs) && (
            <div className="t-italic" style={{ fontSize: 18, opacity: 0.85, textAlign: 'right' }}>
              {event.location}
              {event.location && event.specs && <br />}
              {event.specs && (
                <span className="t-meta" style={{ opacity: 0.65 }}>{event.specs}</span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '60px 0',
        textAlign: 'center',
        opacity: 0.5,
      }}
      className="t-italic"
    >
      Nessun evento ancora caricato.
    </div>
  )
}

export function PhotoStory({ eventId, go }: { eventId: string; go: GoFn }) {
  const direct = eventById(eventId)
  const fallback = firstEventByTag(eventId)
  const f = direct ?? fallback ?? events[0]
  const [activeIdx, setActiveIdx] = useState(0)

  if (!f) {
    return (
      <section
        className="page dark-grain"
        style={{ background: 'var(--ink-deep)', color: 'var(--ivory)', minHeight: '100vh', padding: '120px var(--gutter)' }}
      >
        <div className="t-italic" style={{ fontSize: 24, opacity: 0.7 }}>
          Nessun evento disponibile.{' '}
          <button data-cursor="lg" onClick={() => go('foto')} style={{ color: 'var(--brass)' }}>
            ← Torna al capitolo
          </button>
        </div>
      </section>
    )
  }

  const { prev, next } = adjacentEvents(f.id)
  const contactSheet = f.photos.slice(0, 16)
  const activeFile = contactSheet[activeIdx] ?? f.cover
  const scheda: [string, string][] = [
    ['DATA', formatDate(f.date)],
    ...(f.location ? [['LOCATION', f.location] as [string, string]] : []),
    ...(f.subtitle ? [['SOGGETTO', f.subtitle] as [string, string]] : []),
    ...(f.gear?.lens ? [['OTTICA', f.gear.lens] as [string, string]] : []),
    ...(f.gear?.body ? [['CORPO', f.gear.body] as [string, string]] : []),
    ...(f.specs ? [['EXPO', f.specs] as [string, string]] : []),
  ]

  return (
    <section
      className="page dark-grain"
      style={{
        background: 'var(--ink-deep)',
        color: 'var(--ivory)',
        paddingBottom: 100,
        minHeight: '100vh',
      }}
    >
      <div style={{ padding: '110px var(--gutter) 0' }}>
        <div className="t-meta" style={{ opacity: 0.75 }}>
          <button onClick={() => go('foto')} data-cursor="lg" style={{ color: 'inherit' }}>
            CAPITOLO II · LA LENTE
          </button>
          <span style={{ opacity: 0.4, margin: '0 14px' }}>/</span>
          <span style={{ color: 'var(--brass)' }}>{f.tag.toUpperCase()}</span>
          <span style={{ opacity: 0.4, margin: '0 14px' }}>/</span>
          <span style={{ color: 'var(--brass)' }}>
            {f.title.toUpperCase()} '{f.year.slice(-2)}
          </span>
        </div>
      </div>

      <div className="stagger" style={{ padding: '36px var(--gutter) 0' }}>
        <div className="t-italic" style={{ fontSize: 26, opacity: 0.75 }}>
          {f.subtitle ?? ''}
        </div>
        <h1
          className="t-display"
          style={{ fontSize: 'clamp(72px, 11vw, 200px)', margin: '12px 0', lineHeight: 0.82 }}
        >
          {f.title.toUpperCase()}
        </h1>
        <div
          style={{ display: 'flex', alignItems: 'baseline', gap: 24, color: 'var(--brass)', flexWrap: 'wrap' }}
          className="t-meta"
        >
          <span>{formatDate(f.date)}</span>
          {f.location && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{f.location.toUpperCase()}</span>
            </>
          )}
          {f.specs && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{f.specs}</span>
            </>
          )}
        </div>

        {f.links && (
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            {f.links.instagram_url && <LinkPill href={f.links.instagram_url} label="INSTAGRAM ↗" />}
            {f.links.gallery_url && <LinkPill href={f.links.gallery_url} label="GALLERIA COMPLETA ↗" />}
            {f.links.external_url && <LinkPill href={f.links.external_url} label="ALTRO ↗" />}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '60px var(--gutter) 0',
          display: 'grid',
          gridTemplateColumns: '1.7fr 1fr',
          gap: 48,
        }}
      >
        <PhotoFrame
          event={f}
          file={activeFile}
          ratio="3 / 2"
          dark
          caption={{
            left: `HERO · ${(f.subtitle ?? '').toUpperCase()}`,
            right: `${activeIdx + 1} / ${Math.max(1, contactSheet.length)}`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 24,
              top: 24,
              fontFamily: 'Italiana, serif',
              fontSize: 'clamp(40px, 4vw, 76px)',
              letterSpacing: '.12em',
              color: 'var(--brass)',
              opacity: 0.5,
              zIndex: 2,
            }}
          >
            FIG. 01
          </div>
        </PhotoFrame>

        <div>
          {f.description_it && (
            <div style={{ marginBottom: 30 }}>
              <div className="t-meta" style={{ color: 'var(--brass)' }}>DIARIO DI BORDO</div>
              <hr className="hr-brass" style={{ margin: '10px 0 18px' }} />
              <p className="t-serif" style={{ fontSize: 19, lineHeight: 1.6, opacity: 0.9, margin: 0, whiteSpace: 'pre-wrap' }}>
                {f.description_it}
              </p>
            </div>
          )}

          {scheda.length > 0 && (
            <div>
              <div className="t-meta" style={{ color: 'var(--brass)' }}>SCHEDA</div>
              <hr className="hr-brass" style={{ margin: '10px 0 14px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', rowGap: 8, fontSize: 15 }}>
                {scheda.map(([k, v]) => (
                  <Fragment key={k}>
                    <span className="t-meta" style={{ opacity: 0.55 }}>{k}</span>
                    <span className="t-italic" style={{ opacity: 0.85 }}>{v}</span>
                  </Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {contactSheet.length > 0 && (
        <div style={{ padding: '60px var(--gutter) 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 className="t-italic" style={{ fontSize: 30, margin: 0 }}>Foglio contatto</h3>
            <div className="t-meta" style={{ opacity: 0.65 }}>
              {contactSheet.length} SCATTI · SELEZIONE
            </div>
          </div>
          <hr className="hr-brass" style={{ marginTop: 12 }} />

          <div
            style={{
              marginTop: 24,
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 8,
            }}
          >
            {contactSheet.map((file, i) => (
              <Clickable
                key={file}
                onClick={() => setActiveIdx(i)}
                cursor="xl"
                cursorLabel="VEDI"
                style={{
                  outline: activeIdx === i ? '1px solid var(--brass)' : 'none',
                  outlineOffset: 1,
                  transition: 'transform .35s var(--ease-soft)',
                  transform: activeIdx === i ? 'scale(0.97)' : 'scale(1)',
                }}
              >
                <PhotoFrame event={f} file={file} ratio="3 / 2" dark>
                  <div
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 8,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                      color: 'var(--brass)',
                      opacity: 0.75,
                      letterSpacing: '.15em',
                      zIndex: 2,
                    }}
                  >
                    {String(i + 1).padStart(3, '0')}
                  </div>
                </PhotoFrame>
              </Clickable>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          margin: '120px var(--gutter) 0',
          paddingTop: 28,
          borderTop: 'var(--hair) solid var(--brass)',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
        }}
      >
        <button
          data-cursor="lg"
          onClick={() => (prev ? go('story', prev.id) : go('foto'))}
          className="t-italic"
          style={{ fontSize: 20, color: 'var(--ivory)', textAlign: 'left', opacity: prev ? 1 : 0.5 }}
          disabled={!prev}
        >
          {prev ? `← ${prev.title} '${prev.year.slice(-2)}` : '← Torna al capitolo'}
        </button>
        <div className="t-meta" style={{ color: 'var(--brass)' }}>
          —  PAG. {ROUTE_META.story.page}  —
        </div>
        <button
          data-cursor="lg"
          onClick={() => (next ? go('story', next.id) : go('foto'))}
          className="t-italic"
          style={{ fontSize: 20, color: 'var(--ivory)', textAlign: 'right', opacity: next ? 1 : 0.5 }}
          disabled={!next}
        >
          {next ? `${next.title} '${next.year.slice(-2)} →` : 'Torna al capitolo →'}
        </button>
      </div>
    </section>
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
