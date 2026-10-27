import { useCvDownload } from '../hooks/useCvDownload'

// Header-sized button: "CV ↓" beside the nav items. The download is pulled
// on demand (Drive archive, bundled PDF as fallback) — never a link to Drive.
export default function CvButton() {
  const { busy, failed, download } = useCvDownload()
  return (
    <button
      onClick={download}
      disabled={busy}
      title={failed ? 'CV non disponibile al momento' : 'Scarica il CV (PDF)'}
      aria-label="Scarica il curriculum in PDF"
      style={failed ? { color: 'var(--accent)' } : undefined}
    >
      CV {failed ? '✕' : '↓'}
    </button>
  )
}
