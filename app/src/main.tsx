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

createRoot(document.getElementById('root')!).render(<App />)
