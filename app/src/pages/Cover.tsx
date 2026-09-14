import { Fragment } from 'react'
import type { Route } from '../lib/data'
import { DATA } from '../lib/data'
import NameReveal from '../components/NameReveal'
import Typewriter from '../components/Typewriter'
import Clickable from '../components/Clickable'

function ChapterCard({
  no,
  title,
  subtitle,
  kind = 'light',
  onEnter,
  hint,
}: {
  no: string
  title: string
  subtitle: string
  kind?: 'light' | 'dark'
  onEnter: () => void
  hint: string
}) {
  const isDark = kind === 'dark'
  return (
    <Clickable
      onClick={onEnter}
      cursor="xl"
      cursorLabel="ENTRA"
      className="hover-rise chapter-card"
      style={{
        position: 'relative',
        background: isDark ? 'var(--ink-deep)' : 'var(--ivory)',
        color: isDark ? 'var(--ivory)' : 'var(--ink)',
        padding: '40px 36px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: `var(--hair) solid ${isDark ? 'var(--brass)' : 'var(--leather)'}`,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 14,
          right: 16,
          fontFamily: '"Italiana", serif',
          fontSize: 14,
          letterSpacing: '.5em',
          color: 'var(--brass)',
        }}
      >
        CAP. {no}
      </span>

      <div style={{ marginTop: 30 }}>
        <div className="t-italic" style={{ fontSize: 24, opacity: 0.7, lineHeight: 1, marginBottom: 6 }}>
          {subtitle}
        </div>
        <div className="t-display t-chapter">
          {title}
        </div>
      </div>

      <div>
        <hr className="hr-brass" style={{ marginBottom: 18 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18 }}>
          <div className="t-italic" style={{ fontSize: 17, opacity: 0.8, maxWidth: '70%' }}>
            {hint}
          </div>
          <div className="t-micro" style={{ color: 'var(--brass)' }}>entra →</div>
        </div>
      </div>
    </Clickable>
  )
}

export function Cover({ go }: { go: (next: Route) => void }) {
  return (
    <section
      className="page paper-grain"
      style={{
        background: 'var(--bone)',
        minHeight: '100vh',
        padding: '120px var(--gutter) 100px',
        position: 'relative',
      }}
    >
      <div
        className="t-meta grid-meta3"
        style={{
          gap: 24,
          opacity: 0.55,
          color: 'var(--ink)',
        }}
      >
        <span>{DATA.identity.volume}</span>
        <span style={{ textAlign: 'center', color: 'var(--brass)' }}>
          —  UN AUTORE · DUE LINGUAGGI  —
        </span>
        <span style={{ textAlign: 'right' }}>
          {DATA.identity.location} · {DATA.identity.year}
        </span>
      </div>

      <div style={{ marginTop: 'clamp(40px, 6vh, 80px)', textAlign: 'center' }}>
        <NameReveal
          text="Marcello"
          className="t-display"
          style={{ fontSize: 'var(--t-jumbo)', display: 'block' }}
          delay={0.1}
        />
        <NameReveal
          text="Ronchetti"
          className="t-display"
          style={{ fontSize: 'var(--t-jumbo)', display: 'block', color: 'var(--oxblood)' }}
          delay={0.5}
        />
      </div>

      <div style={{ textAlign: 'center', marginTop: 36, minHeight: 70 }}>
        <Typewriter
          text={DATA.identity.tagline}
          delay={1700}
          speed={32}
          className="t-italic"
          style={{ fontSize: 'clamp(20px, 1.8vw, 26px)', opacity: 0.8, lineHeight: 1.3 }}
        />
      </div>

      <div
        className="grid-chapters"
        style={{
          marginTop: 'clamp(60px, 8vh, 100px)',
          gap: 'clamp(24px, 3vw, 48px)',
          animationName: 'riseFade',
          animationDuration: '1.2s',
          animationTimingFunction: 'cubic-bezier(.22,.61,.36,1)',
          animationFillMode: 'both',
          animationDelay: '3.2s',
        }}
      >
        <ChapterCard
          no="I"
          subtitle="capitolo primo"
          title={DATA.tech.title}
          kind="light"
          hint="Embedded, IoT, AI, cybersecurity. Sei anni di firmware, banchi di lavoro, terminali aperti."
          onEnter={() => go('tech')}
        />
        <ChapterCard
          no="II"
          subtitle="capitolo secondo"
          title={DATA.foto_chapter.title}
          kind="dark"
          hint="Sport e motorsport in pista e fuori. Dodicimila scatti, quattro stagioni, una sola luce."
          onEnter={() => go('foto')}
        />
      </div>

      <div
        style={{
          textAlign: 'center',
          marginTop: 'clamp(40px, 6vh, 70px)',
          animationName: 'fadeIn',
          animationDuration: '1s',
          animationTimingFunction: 'cubic-bezier(.22,.61,.36,1)',
          animationFillMode: 'both',
          animationDelay: '3.8s',
        }}
      >
        <span className="t-italic" style={{ fontSize: 18, opacity: 0.55 }}>
          ↓ &nbsp; sfoglia la prefazione
        </span>
      </div>
    </section>
  )
}

export function Preface({ go }: { go: (next: Route) => void }) {
  return (
    <section
      className="page paper-grain"
      style={{ background: 'var(--bone-deep)', padding: '120px var(--gutter) 100px', position: 'relative' }}
    >
      <div className="t-meta" style={{ opacity: 0.55, color: 'var(--brass)' }}>
        PREFAZIONE — A MO' DI INTRODUZIONE
      </div>

      <div
        className="t-display t-preface"
        style={{ marginTop: 12, maxWidth: '14ch', color: 'var(--ink)' }}
      >
        {DATA.identity.tagline.split('\n').map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </div>

      <div className="grid-preface" style={{ marginTop: 60, gap: 80 }}>
        <div className="t-serif" style={{ fontSize: 19, lineHeight: 1.6, color: 'var(--ink)', maxWidth: 620 }}>
          <p style={{ marginTop: 0, fontSize: 22, fontStyle: 'italic', opacity: 0.85 }}>
            Ho cominciato con un Arduino e una reflex usata. A distanza di anni, le due cose non si sono mai parlate{' '}
            <em>davvero</em>, ma vivono accanto nello stesso laboratorio.
          </p>
          <p>
            Questo sito è il loro indice. Non scegli un lato — scegli da dove vuoi cominciare. Il{' '}
            <span className="t-italic">capitolo primo</span> raccoglie i progetti che ho costruito: firmware, reti,
            modelli, exploit. Il <span className="t-italic">capitolo secondo</span> raccoglie quello che ho visto:
            piste, podi, pioggia, polvere.
          </p>
          <p>Hanno lo stesso autore, lo stesso paio di mani, due lingue diverse. Sfoglia con calma.</p>

          <div style={{ marginTop: 40, display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{ flex: 1, height: 0, borderTop: 'var(--hair) solid var(--brass)' }} />
            <span className="t-italic" style={{ fontSize: 22, color: 'var(--leather)' }}>
              — m.r., Modena ' 26
            </span>
          </div>
        </div>

        <div style={{ paddingLeft: 24, borderLeft: 'var(--hair) solid var(--leather)' }}>
          <div className="t-meta" style={{ opacity: 0.55 }}>INDICE</div>

          <div style={{ marginTop: 18 }}>
            {(
              [
                ['I', "L'ingegnere — progetti", '04', 'tech'],
                ['I·b', 'skills · cv · certificazioni', '12', 'tech'],
                ['II', 'Il fotografo — galleria', '18', 'foto'],
                ['II·b', 'collaborazioni · esperienze', '26', 'foto'],
                ['III', 'about', '30', 'about'],
                ['IV', 'playground', '34', 'tech'],
                ['V', 'contatti', '38', 'contact'],
              ] as [string, string, string, Route][]
            ).map(([n, t, p, r]) => (
              <Clickable
                key={n}
                onClick={() => go(r)}
                cursor="lg"
                className="hover-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '54px 1fr 40px',
                  alignItems: 'baseline',
                  padding: '14px 0',
                  borderBottom: 'var(--hair) solid var(--leather-a25)',
                }}
              >
                <span className="t-meta" style={{ opacity: 0.65 }}>{n}</span>
                <span className="t-italic" style={{ fontSize: 19 }}>{t}</span>
                <span className="t-meta" style={{ opacity: 0.55, textAlign: 'right' }}>p. {p}</span>
              </Clickable>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
