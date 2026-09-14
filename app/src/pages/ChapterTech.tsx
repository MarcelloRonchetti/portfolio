import type { Project, Route } from '../lib/data'
import { DATA, ROUTE_META } from '../lib/data'
import PhotoFrame from '../components/PhotoFrame'
import Clickable from '../components/Clickable'

type GoFn = (next: Route, ref?: string) => void

function ProjectRow({ p, onClick }: { p: Project; onClick: () => void }) {
  return (
    <Clickable
      onClick={onClick}
      cursor="xl"
      cursorLabel="APRI"
      className="hover-row"
      style={{
        display: 'grid',
        gridTemplateColumns: '60px 110px 1fr 1.4fr 90px',
        padding: '24px 0',
        borderBottom: 'var(--hair) solid var(--leather-a20)',
        alignItems: 'baseline',
        gap: 18,
      }}
    >
      <span className="t-meta" style={{ opacity: 0.55 }}>'{p.year.slice(-2)}</span>
      <span className="t-meta" style={{ opacity: 0.75 }}>{p.kind}</span>
      <div>
        <div className="t-display" style={{ fontSize: 32, lineHeight: 1 }}>{p.title}</div>
        <div className="t-italic" style={{ fontSize: 18, opacity: 0.75, marginTop: 2 }}>{p.tagline}</div>
      </div>
      <div className="t-serif" style={{ fontSize: 16, opacity: 0.8, lineHeight: 1.4 }}>
        {p.summary}
      </div>
      <div className="t-meta" style={{ opacity: 0.65, textAlign: 'right', color: 'var(--oxblood)' }}>
        leggi →
      </div>
    </Clickable>
  )
}

export function ChapterTech({ go }: { go: GoFn }) {
  const featured = DATA.tech.projects.find((p) => p.featured) || DATA.tech.projects[0]
  const others = DATA.tech.projects.filter((p) => !p.featured)
  const otherYears = others.map((p) => Number(p.year))

  return (
    <section
      className="page paper-grain"
      style={{
        background: 'var(--bone)',
        padding: '120px var(--gutter) 80px',
        minHeight: '100vh',
        color: 'var(--ink)',
      }}
    >
      <div className="stagger">
        <div className="t-meta" style={{ color: 'var(--brass)' }}>
          CAPITOLO PRIMO · L'INGEGNERE
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'flex-end',
            gap: 36,
            marginTop: 14,
          }}
        >
          <div>
            <h1
              className="t-display"
              style={{ fontSize: 'clamp(72px, 9.5vw, 168px)', margin: 0, lineHeight: 0.82 }}
            >
              IL LAB
            </h1>
            <div
              className="t-italic"
              style={{
                fontSize: 'clamp(20px, 1.7vw, 26px)',
                marginTop: 12,
                opacity: 0.8,
                maxWidth: '50ch',
              }}
            >
              {DATA.tech.intro}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="t-meta" style={{ opacity: 0.55 }}>PROGETTI</div>
            <div className="t-display" style={{ fontSize: 'clamp(48px, 5vw, 80px)', color: 'var(--oxblood)' }}>
              {DATA.tech.projects.length}
            </div>
            <div className="t-italic" style={{ fontSize: 16, opacity: 0.65 }}>2020 — 2026</div>
          </div>
        </div>

        <hr className="hr-brass" style={{ marginTop: 36 }} />
      </div>

      <div
        style={{
          marginTop: 60,
          display: 'grid',
          gridTemplateColumns: '1.45fr 1fr',
          gap: 48,
          alignItems: 'stretch',
        }}
      >
        <PhotoFrame
          tag="IN PRIMO PIANO · 2026"
          caption={{ left: `${featured.title.toUpperCase()} · BANCO DI PROVA`, right: `01 / ${String(DATA.tech.projects.length).padStart(2, '0')}` }}
          style={{ minHeight: 480 }}
          onClick={() => go('project', featured.id)}
        >
          <div
            style={{
              position: 'absolute',
              left: 24,
              top: 24,
              color: 'var(--leather)',
              fontFamily: 'Italiana, serif',
              fontSize: 'clamp(40px, 5vw, 76px)',
              letterSpacing: '.18em',
              mixBlendMode: 'multiply',
              opacity: 0.8,
            }}
          >
            {featured.title.split('-')[0].toUpperCase()}
          </div>
        </PhotoFrame>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="t-meta" style={{ opacity: 0.55 }}>IN PRIMO PIANO — {featured.year}</div>
          <h2
            className="t-display"
            style={{ fontSize: 'clamp(36px, 4vw, 64px)', marginTop: 4, marginBottom: 6 }}
          >
            {featured.title}
          </h2>
          <div className="t-italic" style={{ fontSize: 22, color: 'var(--oxblood)', marginBottom: 18 }}>
            “{featured.tagline}”
          </div>
          <div className="t-serif" style={{ fontSize: 18, lineHeight: 1.55, opacity: 0.85 }}>
            {featured.summary}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 22 }}>
            {featured.stack.map((s) => (
              <span
                key={s}
                className="t-meta"
                style={{
                  padding: '4px 10px',
                  border: 'var(--hair) solid var(--leather)',
                  opacity: 0.85,
                }}
              >
                {s}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 28 }}>
            <button
              data-cursor="xl"
              data-cursor-label="LEGGI"
              onClick={() => go('project', featured.id)}
              className="t-meta"
              style={{
                padding: '14px 24px',
                border: 'var(--hair) solid var(--leather)',
                background: 'var(--ivory)',
                letterSpacing: '.3em',
              }}
            >
              LEGGI IL CASO STUDIO →
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 className="t-italic" style={{ fontSize: 32, margin: 0 }}>altri lavori</h3>
          <div className="t-meta" style={{ opacity: 0.55 }}>
            {Math.min(...otherYears)} — {Math.max(...otherYears)} · {others.length} ALTRI
          </div>
        </div>
        <hr className="hr-ink" style={{ marginTop: 14 }} />

        {others.map((p) => (
          <ProjectRow key={p.id} p={p} onClick={() => go('project', p.id)} />
        ))}
      </div>

      <div style={{ marginTop: 120 }}>
        <div className="t-meta" style={{ color: 'var(--brass)' }}>I·b — STRUMENTI DEL MESTIERE</div>
        <h3 className="t-display" style={{ fontSize: 'clamp(40px, 5vw, 76px)', marginTop: 10, marginBottom: 36 }}>
          SKILLS
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 36 }}>
          {Object.entries({
            linguaggi: DATA.tech.skills.languages,
            embedded: DATA.tech.skills.embedded,
            'iot · rete': DATA.tech.skills.iot,
            'ai · visione': DATA.tech.skills.ai,
            cyber: DATA.tech.skills.sec,
            ops: DATA.tech.skills.ops,
          }).map(([k, items]) => (
            <div key={k}>
              <div className="t-italic" style={{ fontSize: 22, marginBottom: 8 }}>{k}</div>
              <hr className="hr-ink" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {items.map((it) => (
                  <span
                    key={it}
                    className="t-meta"
                    style={{
                      padding: '3px 8px',
                      border: 'var(--hair) solid var(--leather)',
                      opacity: 0.85,
                    }}
                  >
                    {it}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 64 }}>
          <div className="t-italic" style={{ fontSize: 22, marginBottom: 8 }}>certificazioni</div>
          <hr className="hr-ink" />
          {DATA.tech.certifications.map((c) => (
            <div
              key={c.n}
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr auto',
                padding: '14px 0',
                borderBottom: 'var(--hair) solid var(--leather-a20)',
                alignItems: 'baseline',
              }}
            >
              <span className="t-meta" style={{ opacity: 0.55 }}>{c.y}</span>
              <span className="t-italic" style={{ fontSize: 22 }}>{c.n}</span>
              <span className="t-meta" style={{ opacity: 0.55 }}>{c.org}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// FIG. 02 — firmware excerpt, specific to the greenhouse case study.
const FIRMWARE_EXCERPT = `// task: lettura sensori e pubblicazione MQTT
void sensor_task(void *arg) {
    sensor_data_t d;
    while (true) {
        if (sht41_read(&hum, &temp) == ESP_OK) {
            d.temperature = temp;
            d.humidity    = hum;
            d.soil        = soil_capacitive_read();
            d.lux         = bh1750_read();
            d.timestamp   = esp_timer_get_time();
            xQueueSend(mqtt_queue, &d, pdMS_TO_TICKS(200));
        }
        vTaskDelay(pdMS_TO_TICKS(CFG_SAMPLE_MS));
    }
}`

export function ProjectDetail({ projectId, go }: { projectId: string; go: GoFn }) {
  const projects = DATA.tech.projects
  const idx = Math.max(0, projects.findIndex((x) => x.id === projectId))
  const p = projects[idx] || projects[0]
  const prev = idx > 0 ? projects[idx - 1] : undefined
  const next = idx < projects.length - 1 ? projects[idx + 1] : undefined
  const stats: [string, string][] = p.stats ?? []

  return (
    <section
      className="page paper-grain"
      style={{
        background: 'var(--bone)',
        padding: '120px var(--gutter) 100px',
        minHeight: '100vh',
        color: 'var(--ink)',
      }}
    >
      <div className="t-meta" style={{ opacity: 0.65 }}>
        <button onClick={() => go('tech')} data-cursor="lg" style={{ color: 'inherit' }}>
          CAPITOLO I · L'INGEGNERE
        </button>
        <span style={{ opacity: 0.35, margin: '0 14px' }}>/</span>
        <span style={{ color: 'var(--oxblood)' }}>{p.title.toUpperCase()}</span>
      </div>

      <div className="stagger" style={{ marginTop: 28 }}>
        <div className="t-italic" style={{ fontSize: 26, opacity: 0.75 }}>{p.tagline}</div>
        <h1
          className="t-display"
          style={{ fontSize: 'clamp(64px, 8.5vw, 148px)', margin: '12px 0 0', lineHeight: 0.85 }}
        >
          {p.title}
        </h1>
        <div className="t-meta" style={{ marginTop: 14, color: 'var(--brass)' }}>
          {p.kind} · {p.year} · {p.status || 'live'}
        </div>
      </div>

      <div
        style={{
          marginTop: 50,
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 48,
        }}
      >
        <PhotoFrame
          tag="FIG. 01 — BANCO DI PROVA"
          caption={{ left: p.title.toUpperCase(), right: `01 / ${String(projects.length).padStart(2, '0')}` }}
          style={{ minHeight: 480 }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {stats.length > 0 && (
            <div>
              <div className="t-meta" style={{ color: 'var(--brass)' }}>SCHEDA TECNICA</div>
              <hr className="hr-ink" style={{ marginTop: 8, marginBottom: 18 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
                {stats.map(([v, k]) => (
                  <div key={k}>
                    <div
                      className="t-display"
                      style={{ fontSize: 'clamp(28px, 3vw, 44px)', color: 'var(--oxblood)' }}
                    >
                      {v}
                    </div>
                    <div className="t-meta" style={{ opacity: 0.55, marginTop: 2 }}>{k}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 30 }}>
            <div className="t-meta" style={{ color: 'var(--brass)' }}>STACK</div>
            <hr className="hr-ink" style={{ marginTop: 8, marginBottom: 12 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {p.stack.map((s) => (
                <span
                  key={s}
                  className="t-meta"
                  style={{ padding: '4px 10px', border: 'var(--hair) solid var(--leather)' }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 100, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48 }}>
        {(
          [
            { roman: 'I', t: 'il problema', body: p.problem },
            { roman: 'II', t: "l'approccio", body: p.approach },
            { roman: 'III', t: "l'esito", body: p.outcome },
          ] as { roman: string; t: string; body?: string }[]
        )
          .filter((s) => s.body)
          .map((s) => (
            <div key={s.roman}>
              <div className="t-italic" style={{ fontSize: 18, color: 'var(--brass)' }}>— {s.roman}</div>
              <h3 className="t-italic" style={{ fontSize: 30, margin: '4px 0 14px' }}>{s.t}</h3>
              <hr className="hr-ink" style={{ marginBottom: 14 }} />
              <p className="t-serif" style={{ fontSize: 17, lineHeight: 1.55, margin: 0 }}>{s.body}</p>
            </div>
          ))}
      </div>

      {p.id === 'greenhouse-controller' && (
        <div style={{ marginTop: 100 }}>
          <div className="t-meta" style={{ color: 'var(--brass)' }}>FIG. 02 — ESTRATTO DI CODICE</div>
          <hr className="hr-brass" style={{ marginTop: 8, marginBottom: 24 }} />

          <div
            className="dark-grain"
            style={{
              background: 'var(--ink-deep)',
              color: 'var(--ivory)',
              padding: '28px 36px',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 13.5,
              lineHeight: 1.7,
              overflowX: 'auto',
            }}
          >
            <div
              style={{
                color: 'var(--brass)',
                opacity: 0.8,
                marginBottom: 14,
                fontSize: 11,
                letterSpacing: '.25em',
              }}
            >
              FIRMWARE/MAIN.C · L. 142 — 168
            </div>
            <pre style={{ margin: 0, whiteSpace: 'pre' }}>{FIRMWARE_EXCERPT}</pre>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 80,
          paddingTop: 28,
          borderTop: 'var(--hair) solid var(--brass)',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          fontFamily: '"Cormorant Garamond", serif',
          fontStyle: 'italic',
        }}
      >
        <button
          data-cursor="lg"
          onClick={() => (prev ? go('project', prev.id) : go('tech'))}
          style={{ fontSize: 19, color: 'var(--ink)', textAlign: 'left', opacity: prev ? 1 : 0.5 }}
        >
          {prev ? `← ${prev.title}` : '← Torna al capitolo'}
        </button>
        <div className="t-meta" style={{ color: 'var(--brass)' }}>
          —  PAG. {ROUTE_META.project.page}  —
        </div>
        <button
          data-cursor="lg"
          onClick={() => (next ? go('project', next.id) : go('tech'))}
          style={{ fontSize: 19, color: 'var(--ink)', textAlign: 'right', opacity: next ? 1 : 0.5 }}
        >
          {next ? `${next.title} →` : 'Torna al capitolo →'}
        </button>
      </div>
    </section>
  )
}
