import { createRoot } from 'react-dom/client'
// Self-hosted fonts (@fontsource): replaces the Google Fonts CDN — the only
// third-party request the site made. Weight files include every subset via
// unicode-range, with font-display: swap.
import '@fontsource/italiana/400.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
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
    const search = qi === -1 ? '' : p.slice(qi)
    window.history.replaceState(null, '', `${base}${path}${search}`)
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(<App />)
