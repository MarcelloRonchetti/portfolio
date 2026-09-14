import { useEffect, useState } from 'react'
import type { Route } from './lib/data'
import { DATA } from './lib/data'
import TopBar from './components/TopBar'
import { Cover } from './pages/Cover'
import { Gallery, PhotoStory } from './pages/Gallery'
import Contact from './pages/Contact'

const ROUTES: Route[] = ['cover', 'gallery', 'story', 'contact']

function persistGet(k: string, fallback: string): string {
  try {
    return localStorage.getItem(k) ?? fallback
  } catch {
    return fallback
  }
}
function persistSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}

// Deep links: 404.html redirects unknown paths to /?p=<path>; restore the route once.
// "story/<event-id>" deep-links a single event. Persisted routes are validated —
// a stale value must never render an empty page.
function initialRoute(): Route {
  try {
    const p = new URLSearchParams(window.location.search).get('p') ?? ''
    const storyMatch = p.match(/^story\/([\w-]+)\/?$/)
    if (storyMatch) {
      persistSet('mr.storyId', storyMatch[1])
      window.history.replaceState(null, '', window.location.pathname)
      return 'story'
    }
    const path = p.replace(/\/+$/, '').replace(/^\//, '')
    if (ROUTES.includes(path as Route)) {
      window.history.replaceState(null, '', window.location.pathname)
      return path as Route
    }
  } catch {
    /* ignore */
  }
  const stored = persistGet('mr.route', 'cover') as Route
  return ROUTES.includes(stored) ? stored : 'cover'
}

export default function App() {
  const [route, setRoute] = useState<Route>(initialRoute)
  const [storyId, setStoryId] = useState(() => persistGet('mr.storyId', ''))

  useEffect(() => persistSet('mr.route', route), [route])
  useEffect(() => persistSet('mr.storyId', storyId), [storyId])

  useEffect(() => {
    const dark = route === 'gallery' || route === 'story'
    document.body.setAttribute('data-section', dark ? 'dark' : 'light')
  }, [route])

  const go = (next: Route, ref?: string) => {
    if (next === route && !ref) return
    if (next === 'story' && ref) setStoryId(ref)
    setRoute(next)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  let screen: React.ReactNode = null
  if (route === 'cover') {
    screen = <Cover go={go} />
  } else if (route === 'gallery') {
    screen = <Gallery go={go} />
  } else if (route === 'story') {
    screen = <PhotoStory eventId={storyId} go={go} />
  } else if (route === 'contact') {
    screen = <Contact />
  }

  return (
    <>
      <TopBar route={route} onNavigate={go} />
      <div key={route} className="page-fade">
        {screen}
      </div>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} {DATA.identity.name}</span>
        <span>{DATA.identity.location}</span>
        <a className="link-ext" href={`mailto:${DATA.identity.email}`}>Email</a>
      </footer>
    </>
  )
}
