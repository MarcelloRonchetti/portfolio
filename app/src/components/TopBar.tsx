import { useLocation, useNavigate } from 'react-router-dom'
import { DATA } from '../lib/data'
import { vtNavigate } from '../lib/vtNavigate'
import type { CvState } from '../hooks/useCvDownload'
import CvButton from './CvButton'

type Theme = 'day' | 'night'

const ITEMS: { path: string; label: string; active: (p: string) => boolean }[] = [
  { path: '/', label: 'home', active: (p) => p === '/' },
  { path: '/gallery', label: 'galleria', active: (p) => p.startsWith('/gallery') || p.startsWith('/story') },
  { path: '/videos', label: 'video', active: (p) => p.startsWith('/videos') },
  { path: '/contact', label: 'contatti', active: (p) => p.startsWith('/contact') },
]

export default function TopBar({
  theme,
  onToggleTheme,
  cv,
}: {
  theme: Theme
  onToggleTheme: () => void
  cv: CvState
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Same camera-push language as go(): header navigation never hard-cuts.
  const vt = (path: string) => vtNavigate(navigate, path)

  return (
    <header className="site-header">
      <button className="brand" onClick={() => vt('/')}>
        {DATA.identity.name}
      </button>
      <nav aria-label="Navigazione principale">
        {ITEMS.map((it) => (
          <button
            key={it.path}
            data-active={it.active(pathname) || undefined}
            onClick={() => vt(it.path)}
          >
            {it.label}
          </button>
        ))}
        <CvButton {...cv} />
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'night' ? 'Passa al tema giorno' : 'Passa al tema notte'}
          title={theme === 'night' ? 'Tema giorno' : 'Tema notte'}
        >
          {theme === 'night' ? '☀' : '☾'}
        </button>
      </nav>
    </header>
  )
}
