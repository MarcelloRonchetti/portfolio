import { useLocation, useNavigate } from 'react-router-dom'
import { DATA } from '../lib/data'
import CvButton from './CvButton'

type Theme = 'day' | 'night'

const ITEMS: { path: string; label: string; active: (p: string) => boolean }[] = [
  { path: '/', label: 'home', active: (p) => p === '/' },
  { path: '/gallery', label: 'galleria', active: (p) => p.startsWith('/gallery') || p.startsWith('/story') },
  { path: '/videos', label: 'video', active: (p) => p.startsWith('/videos') },
  { path: '/contact', label: 'contatti', active: (p) => p.startsWith('/contact') },
]

export default function TopBar({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <header className="site-header">
      <button className="brand" onClick={() => navigate('/')}>
        {DATA.identity.name}
      </button>
      <nav>
        {ITEMS.map((it) => (
          <button
            key={it.path}
            data-active={it.active(pathname) || undefined}
            onClick={() => navigate(it.path)}
          >
            {it.label}
          </button>
        ))}
        <CvButton />
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
