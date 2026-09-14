import type { Route } from '../lib/data'

type Props = {
  route: Route
  onNavigate: (next: Route) => void
  theme: 'light' | 'dark'
  setTheme: (v: 'light' | 'dark') => void
}

const ITEMS: { id: Route; label: string }[] = [
  { id: 'cover', label: 'home' },
  { id: 'tech', label: 'il lab' },
  { id: 'foto', label: 'la lente' },
  { id: 'about', label: 'about' },
  { id: 'contact', label: 'contatti' },
]

export default function TopBar({ route, onNavigate, theme, setTheme }: Props) {
  return (
    <div className="chrome-top">
      <div className="brand">
        <span>M</span>
        <span style={{ opacity: 0.35, letterSpacing: 0 }}>—</span>
        <span>R</span>
        <span className="brand-sub" style={{ marginLeft: 14 }}>
          Marcello Ronchetti
        </span>
      </div>

      <nav>
        {ITEMS.map((it) => {
          const active =
            route === it.id ||
            (route === 'project' && it.id === 'tech') ||
            (route === 'story' && it.id === 'foto')
          return (
            <button
              key={it.id}
              data-active={active || undefined}
              data-cursor="lg"
              onClick={() => onNavigate(it.id)}
            >
              {it.label}
            </button>
          )
        })}
      </nav>

      <div className="controls">
        <div className="seg">
          <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')} data-cursor="lg">
            ☀
          </button>
          <span className="div">·</span>
          <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')} data-cursor="lg">
            ☾
          </button>
        </div>
      </div>
    </div>
  )
}
