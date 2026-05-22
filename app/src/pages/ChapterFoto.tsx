import { Fragment, useState } from 'react'
import type { Collection, Route } from '../lib/data'
import { DATA } from '../lib/data'

type GoFn = (next: Route, ref?: string) => void

function CollectionCard({ c, onClick }: { c: Collection; onClick: () => void }) {
  return (
    <div
      data-cursor="xl"
      data-cursor-label="APRI"
      onClick={onClick}
      style={{
        position: 'relative',
        border: 'var(--hair) solid var(--brass)',
        padding: '20px 22px 22px',
        minHeight: 260,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'rgba(168,133,92,.04)',
        overflow: 'hidden',
        transition: 'background .4s var(--ease-soft), transform .4s var(--ease-soft)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(168,133,92,.12)'
        e.currentTarget.style.transform = 'translateY(-4px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(168,133,92,.04)'
        e.currentTarget.style.transform = ''
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
      </div>
    </div>
  )
}

export function ChapterFoto({ go }: { go: GoFn }) {
  const f = DATA.foto.featured

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
        <div className="frame dark" style={{ position: 'absolute', inset: 0 }}>
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
              {DATA.foto.intro_it}
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
              {DATA.foto.shot_count}
            </div>
            <div className="t-italic" style={{ fontSize: 18, opacity: 0.75 }}>
              dal 2019 — {DATA.identity.year}
            </div>
          </div>

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
                FEATURED · {f.subtitle.toUpperCase()}
              </div>
              <div
                className="t-display"
                style={{
                  fontSize: 'clamp(40px, 5vw, 78px)',
                  color: 'var(--ivory)',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.title.toUpperCase()} ' {f.year.slice(-2)}
              </div>
            </div>
            <div className="t-italic" style={{ fontSize: 18, opacity: 0.85, textAlign: 'right' }}>
              {f.author}
              <br />
              <span className="t-meta" style={{ opacity: 0.65 }}>{f.specs}</span>
            </div>
          </div>
        </div>
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
            L'unica differenza tra una fotografia e un ricordo è chi la sta guardando.
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
            sei capitoli, una stagione viva
          </div>
        </div>
        <hr className="hr-brass" />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
            marginTop: 40,
          }}
        >
          {DATA.foto.collections.map((c) => (
            <CollectionCard key={c.tag} c={c} onClick={() => go('story', c.tag)} />
          ))}
        </div>
      </div>

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
          {DATA.foto.stories.map((s, i) => (
            <div
              key={s.title}
              data-cursor="xl"
              data-cursor-label="LEGGI"
              onClick={() => go('story', s.tag)}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 140px 1fr 2fr 60px',
                padding: '26px 0',
                alignItems: 'baseline',
                gap: 24,
                borderBottom: 'var(--hair) solid rgba(168,133,92,.3)',
                transition: 'padding-left .4s var(--ease-soft), background .4s var(--ease-soft)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.paddingLeft = '14px'
                e.currentTarget.style.background = 'rgba(168,133,92,.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.paddingLeft = ''
                e.currentTarget.style.background = ''
              }}
            >
              <span className="t-meta" style={{ opacity: 0.55 }}>0{i + 1}</span>
              <span className="t-meta" style={{ opacity: 0.8, color: 'var(--brass)' }}>{s.tag}</span>
              <span className="t-display" style={{ fontSize: 'clamp(28px, 2.4vw, 40px)' }}>{s.title}</span>
              <span className="t-italic" style={{ fontSize: 18, opacity: 0.8 }}>{s.desc}</span>
              <span className="t-meta" style={{ opacity: 0.55, textAlign: 'right', color: 'var(--brass)' }}>
                {s.when.split(' ')[1]?.slice(-2) ?? '25'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function PhotoStory({ tag, go }: { tag: string; go: GoFn }) {
  const collection = DATA.foto.collections.find((c) => c.tag === tag) || DATA.foto.collections[0]
  const f = DATA.foto.featured
  const [activeIdx, setActiveIdx] = useState(0)

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
          <span style={{ color: 'var(--brass)' }}>{collection.tag.toUpperCase()}</span>
          <span style={{ opacity: 0.4, margin: '0 14px' }}>/</span>
          <span style={{ color: 'var(--brass)' }}>
            {f.title.toUpperCase()} ' {f.year.slice(-2)}
          </span>
        </div>
      </div>

      <div className="stagger" style={{ padding: '36px var(--gutter) 0' }}>
        <div className="t-italic" style={{ fontSize: 26, opacity: 0.75 }}>{f.subtitle}</div>
        <h1
          className="t-display"
          style={{ fontSize: 'clamp(72px, 11vw, 200px)', margin: '12px 0', lineHeight: 0.82 }}
        >
          {f.title.toUpperCase()}
        </h1>
        <div
          style={{ display: 'flex', alignItems: 'baseline', gap: 24, color: 'var(--brass)' }}
          className="t-meta"
        >
          <span>{f.date.toUpperCase()}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{f.location.toUpperCase()}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{f.specs}</span>
        </div>
      </div>

      <div
        style={{
          padding: '60px var(--gutter) 0',
          display: 'grid',
          gridTemplateColumns: '1.7fr 1fr',
          gap: 48,
        }}
      >
        <div className="frame dark" style={{ aspectRatio: '3 / 2' }}>
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
            }}
          >
            FIG. 01
          </div>
          <div className="frame-caption">
            <span>HERO · {f.author.toUpperCase()}</span>
            <span>
              {activeIdx + 1} / {f.gallery_count}
            </span>
          </div>
        </div>

        <div>
          <div className="t-meta" style={{ color: 'var(--brass)' }}>DIARIO DI BORDO</div>
          <hr className="hr-brass" style={{ margin: '10px 0 18px' }} />
          <p className="t-serif" style={{ fontSize: 19, lineHeight: 1.6, opacity: 0.9, margin: 0 }}>
            {f.body_it}
          </p>

          <div style={{ marginTop: 30 }}>
            <div className="t-meta" style={{ color: 'var(--brass)' }}>SCHEDA</div>
            <hr className="hr-brass" style={{ margin: '10px 0 14px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', rowGap: 8, fontSize: 15 }}>
              {(
                [
                  ['LOCATION', f.location],
                  ['DATA', f.date],
                  ['SOGGETTO', f.author],
                  ['OTTICA', '600mm f/4 IS USM'],
                  ['CORPO', 'Canon R5'],
                  ['EXPO', f.specs],
                ] as [string, string][]
              ).map(([k, v]) => (
                <Fragment key={k}>
                  <span className="t-meta" style={{ opacity: 0.55 }}>{k}</span>
                  <span className="t-italic" style={{ opacity: 0.85 }}>{v}</span>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '60px var(--gutter) 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 className="t-italic" style={{ fontSize: 30, margin: 0 }}>Foglio contatto</h3>
          <div className="t-meta" style={{ opacity: 0.65 }}>
            {f.gallery_count} SCATTI · SELEZIONE
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
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              data-cursor="xl"
              data-cursor-label="VEDI"
              onClick={() => setActiveIdx(i)}
              className="frame dark"
              style={{
                aspectRatio: '3 / 2',
                outline: activeIdx === i ? '1px solid var(--brass)' : 'none',
                outlineOffset: 1,
                cursor: 'pointer',
                transition: 'transform .35s var(--ease-soft)',
                transform: activeIdx === i ? 'scale(0.97)' : 'scale(1)',
              }}
            >
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
                }}
              >
                {String(i + 1).padStart(3, '0')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: '80px var(--gutter) 0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}
      >
        <div className="frame dark" style={{ aspectRatio: '4 / 5' }}>
          <div className="frame-tag">FIG. 02</div>
          <div className="frame-caption">
            <span>PADDOCK · ALBA</span>
            <span>1/800 · f/2.8</span>
          </div>
        </div>
        <div className="frame dark" style={{ aspectRatio: '4 / 5' }}>
          <div className="frame-tag">FIG. 03</div>
          <div className="frame-caption">
            <span>SCARPERIA · CURVA BORGO</span>
            <span>1/3200 · f/4</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '100px var(--gutter) 0', maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <span className="t-display" style={{ fontSize: 56, color: 'var(--brass)' }}>—</span>
        <div
          className="t-italic"
          style={{
            fontSize: 'clamp(26px, 2.6vw, 38px)',
            lineHeight: 1.35,
            marginTop: 8,
            color: 'var(--ivory)',
          }}
        >
          "Lo scatto è il numero 31, il primo in cui la moto è perfettamente parallela alla linea di fondo. Il resto è
          cronaca."
        </div>
      </div>

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
          onClick={() => go('foto')}
          className="t-italic"
          style={{ fontSize: 20, color: 'var(--ivory)', textAlign: 'left' }}
        >
          ← Sardegna ' 25
        </button>
        <div className="t-meta" style={{ color: 'var(--brass)' }}>—  PAG. 22  —</div>
        <button
          data-cursor="lg"
          onClick={() => go('foto')}
          className="t-italic"
          style={{ fontSize: 20, color: 'var(--ivory)', textAlign: 'right' }}
        >
          Imola — il paddock →
        </button>
      </div>
    </section>
  )
}
