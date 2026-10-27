import { DATA } from '../lib/data'
import { useCvDownload } from '../hooks/useCvDownload'

export default function Contact() {
  const { email, instagram, tiktok } = DATA.identity
  const cv = useCvDownload()

  return (
    <main className="section" style={{ paddingTop: 140, paddingBottom: 110, minHeight: '80vh' }}>
      <div className="container" style={{ maxWidth: 680 }}>
        <h1 className="t-h1" style={{ marginTop: 0 }}>Contatti</h1>
        <p className="prose" style={{ color: 'var(--muted)' }}>
          Per informazioni, commissioni o collaborazioni:
        </p>

        <div className="contact-rows" style={{ marginTop: 26 }}>
          <button
            className="contact-row"
            onClick={cv.download}
            disabled={cv.busy}
            style={{ textAlign: 'left' }}
            title="Il CV viene scaricato in PDF, senza lasciare la pagina"
          >
            <span className="contact-label">Curriculum</span>
            <span className="contact-value">
              {cv.failed ? 'Non disponibile al momento' : 'Scarica il CV (PDF)'}
            </span>
            <span className="contact-arrow">{cv.busy ? '…' : cv.failed ? '✕' : '↓'}</span>
          </button>
          <a className="contact-row" href={`mailto:${email}`}>
            <span className="contact-label">Email</span>
            <span className="contact-value">{email}</span>
            <span className="contact-arrow">↗</span>
          </a>
          <a className="contact-row" href={instagram.url} target="_blank" rel="noopener noreferrer">
            <span className="contact-label">Instagram</span>
            <span className="contact-value">{instagram.handle}</span>
            <span className="contact-arrow">↗</span>
          </a>
          <a className="contact-row" href={tiktok.url} target="_blank" rel="noopener noreferrer">
            <span className="contact-label">TikTok</span>
            <span className="contact-value">{tiktok.handle}</span>
            <span className="contact-arrow">↗</span>
          </a>
        </div>
      </div>
    </main>
  )
}
