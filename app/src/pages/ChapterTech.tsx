import type { Project, Route } from '../lib/data'
import { DATA } from '../lib/data'
import FramePhoto from '../components/FramePhoto'

type GoFn = (next: Route, ref?: string) => void

function ProjectRow({ p, onClick }: { p: Project; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      data-cursor="xl"
      data-cursor-label="APRI"
      style={{
        display: 'grid',
        gridTemplateColumns: '60px 110px 1fr 1.4fr 90px',
        padding: '24px 0',
        borderBottom: 'var(--hair) solid rgba(74,42,28,.2)',
        alignItems: 'baseline',
        gap: 18,
        transition: 'padding-left .35s var(--ease-soft), background .35s var(--ease-soft)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.paddingLeft = '12px'
        e.currentTarget.style.background = 'rgba(168,133,92,.06)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.paddingLeft = ''
        e.currentTarget.style.background = ''
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
    </div>
  )
}

export function ChapterTech({ go }: { go: GoFn }) {
  const featured = DATA.tech.projects.find((p) => p.featured) || DATA.tech.projects[0]
  const others = DATA.tech.projects.filter((p) => !p.featured).slice(0, 5)

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
              {DATA.tech.intro_it}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="t-meta" style={{ opacity: 0.55 }}>PROGETTI</div>
            <div className="t-display" style={{ fontSize: 'clamp(48px, 5vw, 80px)', color: 'var(--oxblood)' }}>
              17
            </div>
            <div className="t-italic" style={{ fontSize: 16, opacity: 0.65 }}>2020 — 2026</div>
          </div>
        </div>

        <hr className="hr-brass" style={{ marginTop: 36 }} />

        <nav
          style={{
            marginTop: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 28 }}>
            {['progetti', 'skills', 'esperienza', 'certificazioni', 'playground'].map((s, i) => (
              <button
                key={s}
                className="t-italic"
                data-cursor="lg"
                style={{
                  fontSize: 19,
                  color: i === 0 ? 'var(--oxblood)' : 'var(--ink)',
                  opacity: i === 0 ? 1 : 0.6,
                  borderBottom: `var(--hair) solid ${i === 0 ? 'var(--oxblood)' : 'transparent'}`,
                  paddingBottom: 4,
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="t-meta" style={{ opacity: 0.55 }}>
            FILTRA · EMBEDDED · IoT · AI · SEC · ALTRO
          </div>
        </nav>
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
        <FramePhoto
          tag="IN PRIMO PIANO · 2026"
          label="HERO · GREENHOUSE-CONTROLLER · PCB REV.3"
          code="01 / 06"
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
            GREENHOUSE
          </div>
        </FramePhoto>

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

          <div
            style={{
              marginTop: 'auto',
              paddingTop: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            }}
          >
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
            <span className="t-italic" style={{ fontSize: 15, opacity: 0.55 }}>· 8 minuti</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 className="t-italic" style={{ fontSize: 32, margin: 0 }}>altri lavori</h3>
          <div className="t-meta" style={{ opacity: 0.55 }}>2024 — 2025 · 16 ALTRI</div>
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
                borderBottom: 'var(--hair) solid rgba(74,42,28,.18)',
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

export function ProjectDetail({ projectId, go }: { projectId: string; go: GoFn }) {
  const p = DATA.tech.projects.find((x) => x.id === projectId) || DATA.tech.projects[0]
  const stats: [string, string][] =
    p.stats || ([['—', 'tempo'], ['solo', 'team'], ['MIT', 'licenza'], ['live', 'stato']] as [string, string][])

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
        <FramePhoto
          tag="FIG. 01 — BANCO DI PROVA"
          label="GREENHOUSE-CONTROLLER · PCB REV.3 · MASTER + SATELLITE"
          code="01 / 04"
          style={{ minHeight: 480 }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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

          <div style={{ marginTop: 30 }}>
            <div className="t-meta" style={{ color: 'var(--brass)' }}>LINK</div>
            <hr className="hr-ink" style={{ marginTop: 8, marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 24, fontSize: 16 }} className="t-italic">
              <a data-cursor="lg" href="#" style={{ borderBottom: 'var(--hair) solid var(--oxblood)', paddingBottom: 2 }}>
                repository ↗
              </a>
              <a data-cursor="lg" href="#" style={{ borderBottom: 'var(--hair) solid var(--oxblood)', paddingBottom: 2 }}>
                demo live ↗
              </a>
              <a data-cursor="lg" href="#" style={{ borderBottom: 'var(--hair) solid var(--oxblood)', paddingBottom: 2 }}>
                documentazione ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 100, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48 }}>
        {(
          [
            { roman: 'I', t: 'il problema', body: p.problem || 'Lorem ipsum problema da sostituire con contenuto reale.' },
            { roman: 'II', t: "l'approccio", body: p.approach || 'Lorem ipsum approccio.' },
            { roman: 'III', t: "l'esito", body: p.outcome || 'Lorem ipsum esito.' },
          ] as { roman: string; t: string; body: string }[]
        ).map((s) => (
          <div key={s.roman}>
            <div className="t-italic" style={{ fontSize: 18, color: 'var(--brass)' }}>— {s.roman}</div>
            <h3 className="t-italic" style={{ fontSize: 30, margin: '4px 0 14px' }}>{s.t}</h3>
            <hr className="hr-ink" style={{ marginBottom: 14 }} />
            <p className="t-serif" style={{ fontSize: 17, lineHeight: 1.55, margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </div>

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
          <pre style={{ margin: 0, whiteSpace: 'pre' }}>{`// task: lettura sensori e pubblicazione MQTT
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
}`}</pre>
        </div>
      </div>

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
        <button data-cursor="lg" onClick={() => go('tech')} style={{ fontSize: 19, color: 'var(--ink)', textAlign: 'left' }}>
          ← rtos-audio-synth
        </button>
        <div className="t-meta" style={{ color: 'var(--brass)' }}>—  PAG. 06  —</div>
        <button data-cursor="lg" onClick={() => go('tech')} style={{ fontSize: 19, color: 'var(--ink)', textAlign: 'right' }}>
          pose-bike-fitter →
        </button>
      </div>
    </section>
  )
}
