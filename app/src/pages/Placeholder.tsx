import type { Route } from '../lib/data'

export default function Placeholder({ route, go }: { route: Route; go: (next: Route) => void }) {
  const isAbout = route === 'about'
  return (
    <section
      className="page paper-grain"
      style={{
        background: 'var(--bone)',
        padding: '120px var(--gutter)',
        minHeight: '100vh',
        color: 'var(--ink)',
      }}
    >
      <div className="t-meta" style={{ color: 'var(--brass)' }}>
        {isAbout ? 'CAPITOLO III · ABOUT' : 'CAPITOLO V · CONTATTI'}
      </div>
      <h1
        className="t-display"
        style={{ fontSize: 'clamp(64px, 8.5vw, 148px)', margin: '12px 0', lineHeight: 0.85 }}
      >
        {isAbout ? "L'AUTORE" : 'SCRIVIMI'}
      </h1>

      {isAbout ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 60, marginTop: 50 }}>
          <div className="t-serif" style={{ fontSize: 19, lineHeight: 1.6, opacity: 0.9 }}>
            <p style={{ fontSize: 24, fontStyle: 'italic', opacity: 0.9, marginTop: 0 }}>
              Sono nato a Carpi nel 2007. Lavoro nel firmware e nella fotografia di motorsport. Le due cose non si
              parlano, ma vivono accanto.
            </p>
            <p>
              Pagina in costruzione — racconto completo in arrivo. Per ora, l'indice principale è il modo migliore di
              conoscermi: progetti, scatti, scelte.
            </p>
            <p>Per qualsiasi cosa, scrivimi.</p>
          </div>
          <div>
            <div className="frame" style={{ aspectRatio: '3 / 4' }}>
              <div className="frame-tag">RITRATTO</div>
              <div className="frame-caption">
                <span>SELF · 2026</span>
                <span>50mm</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 50, maxWidth: 700 }}>
          <p className="t-italic" style={{ fontSize: 24, opacity: 0.85 }}>
            Una sola casella, due mondi. Scrivimi del progetto, del podio, del bug.
          </p>
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(
              [
                ['EMAIL', 'marcello@ronchetti.dev'],
                ['LINKEDIN', '/in/marcelloronchetti'],
                ['GITHUB', '@marcelloronchetti'],
                ['INSTAGRAM', '@mr.lens'],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div
                key={k}
                data-cursor="lg"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 60px',
                  padding: '16px 0',
                  borderBottom: 'var(--hair) solid rgba(74,42,28,.25)',
                }}
              >
                <span className="t-meta" style={{ opacity: 0.55 }}>{k}</span>
                <span className="t-italic" style={{ fontSize: 22 }}>{v}</span>
                <span className="t-meta" style={{ color: 'var(--oxblood)', textAlign: 'right' }}>→</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 80 }}>
        <button
          onClick={() => go('cover')}
          data-cursor="lg"
          className="t-italic"
          style={{
            fontSize: 22,
            borderBottom: 'var(--hair) solid var(--oxblood)',
            paddingBottom: 3,
          }}
        >
          ← torna alla copertina
        </button>
      </div>
    </section>
  )
}
