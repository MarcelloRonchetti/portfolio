import type { CvState } from '../hooks/useCvDownload'

// Header-sized button: "CV ↓" beside the nav items. The download is pulled
// on demand (Drive archive, bundled PDF as fallback) — never a link to Drive.
// State is spoken, not just shown: busy/failure change label and arrow, the
// failure colour lives in CSS ([data-failed] in index.css). The state comes
// from AppShell so the Contact row and this button always agree.
export default function CvButton({ busy, failed, download }: CvState) {
  return (
    <button
      onClick={download}
      disabled={busy}
      aria-busy={busy || undefined}
      data-failed={failed || undefined}
      title={failed ? 'CV non disponibile al momento' : 'Scarica il CV (PDF)'}
      aria-label={failed ? 'CV non disponibile al momento' : 'Scarica il curriculum in PDF'}
    >
      CV {failed ? '✕' : busy ? '…' : '↓'}
    </button>
  )
}
