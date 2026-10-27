import type { Route } from '../lib/data'
import { DATA } from '../lib/data'

type Theme = 'day' | 'night'

type Props = {
  route: Route
  onNavigate: (next: Route, ref?: string) => void
  theme: Theme
  onToggleTheme: () => void
}

const ITEMS: { id: Route; label: string }[] = [
  { id: 'cover', label: 'home' },
  { id: 'gallery', label: 'galleria' },
  { id: 'contact', label: 'contatti' },
]

export default function TopBar({ route, onNavigate, theme, onToggleTheme }: Props) {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => onNavigate('cover')}>
        {DATA.identity.name}
      </button>
      <nav>
        {ITEMS.map((it) => {
          const active =
            route === it.id ||
            (route === 'story' && it.id === 'gallery')
          return (
            <button
              key={it.id}
              data-active={active || undefined}
              onClick={() => onNavigate(it.id)}
            >
              {it.label}
            </button>
          )
        })}
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
