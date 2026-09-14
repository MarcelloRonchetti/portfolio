import type { Route } from '../lib/data'
import { DATA } from '../lib/data'

type Props = {
  route: Route
  onNavigate: (next: Route, ref?: string) => void
}

const ITEMS: { id: Route; label: string }[] = [
  { id: 'cover', label: 'home' },
  { id: 'gallery', label: 'galleria' },
  { id: 'contact', label: 'contatti' },
]

export default function TopBar({ route, onNavigate }: Props) {
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
      </nav>
    </header>
  )
}
