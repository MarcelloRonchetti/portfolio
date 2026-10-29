import { DATA } from '../lib/data'
import type { CvState } from '../hooks/useCvDownload'
import './Contact.css'

// `cv` is the AppShell-owned download state: this row and the header's CV
// button are two views of the same download and must always agree.
export default function Contact({ cv }: { cv: CvState }) {
  const { email, instagram, tiktok } = DATA.identity

  return (
    <main className="section contact-main">
      <div className="container">
        <div className="section-head">
          <div className="stack" style={{ gap: 6 }}>
            <h1 className="t-h1" style={{ margin: 0 }}>Contatti</h1>
            <p className="t-italic contact-head-sub">
              Per informazioni, commissioni o collaborazioni.
            </p>
          </div>
        </div>

        <div className="contact-rows">
          <button
            className="contact-row"
            onClick={cv.download}
            disabled={cv.busy}
            aria-busy={cv.busy || undefined}
            data-failed={cv.failed || undefined}
            title="Il CV viene scaricato in PDF"
          >
            <span className="contact-label">Curriculum</span>
            <span className="contact-value">
              {cv.failed ? 'Non disponibile al momento' : 'Scarica il CV (PDF)'}
            </span>
            <span className="contact-arrow" aria-hidden="true">
              {cv.busy ? '…' : cv.failed ? '✕' : '↓'}
            </span>
          </button>
          <a className="contact-row" href={`mailto:${email}`}>
            <span className="contact-label">Email</span>
            <span className="contact-value">{email}</span>
            <span className="contact-arrow" aria-hidden="true">↗</span>
          </a>
          <a className="contact-row" href={instagram.url} target="_blank" rel="noopener noreferrer">
            <span className="contact-label">Instagram</span>
            <span className="contact-value">{instagram.handle}</span>
            <span className="contact-arrow" aria-hidden="true">↗</span>
          </a>
          <a className="contact-row" href={tiktok.url} target="_blank" rel="noopener noreferrer">
            <span className="contact-label">TikTok</span>
            <span className="contact-value">{tiktok.handle}</span>
            <span className="contact-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </main>
  )
}
