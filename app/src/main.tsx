import { createRoot } from 'react-dom/client'
// Self-hosted fonts (@fontsource): replaces the Google Fonts CDN — the only
// third-party request the site made. Weight files include every subset via
// unicode-range, with font-display: swap. Archivo Variable carries display
// and UI text (normal + italic axis files); IBM Plex Mono the EXIF-style
// captions and metadata.
import '@fontsource-variable/archivo'
import '@fontsource-variable/archivo/wght-italic.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './index.css'
import App from './App'

// 404.html bridge: GitHub Pages serves 404.html for any path without a
// prerendered page, and it redirects here with the original path as ?p=.
// Restore the real path before the router mounts so it matches the URL.
try {
  const p = new URLSearchParams(window.location.search).get('p')
  if (p) {
    const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
    const qi = p.indexOf('?')
    const path = (qi === -1 ? p : p.slice(0, qi)).replace(/^\/?/, '/')
    // Same-origin only, no protocol-relative or double-slash paths: the bridge
    // restores app routes, it is never a redirect primitive.
    const safe = /^\/(?!\/)/.test(path) && !path.includes('//')
    const search = qi === -1 ? '' : p.slice(qi)
    if (safe) window.history.replaceState(null, '', `${base}${path}${search}`)
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(<App />)
