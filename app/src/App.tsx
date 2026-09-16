import { useEffect, useState } from 'react'
import type { Route } from './lib/data'
import { DATA } from './lib/data'
import TopBar from './components/TopBar'
import { Cover } from './pages/Cover'
import { Gallery, PhotoStory } from './pages/Gallery'
import { categoryFromSlug, eventById } from './lib/events'
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
// "story/<event-id>" deep-links a single event, "gallery/<category>" a gallery
// page. Persisted routes are validated — a stale value must never render an
// empty page.
function initialRoute(): Route {
  try {
    const p = new URLSearchParams(window.location.search).get('p') ?? ''
    const storyMatch = p.match(/^story\/([\w-]+)\/?$/)
    if (storyMatch) {
      persistSet('mr.storyId', storyMatch[1])
      persistSet('mr.storyTag', '') // deep links carry no collection context
      window.history.replaceState(null, '', window.location.pathname)
      return 'story'
    }
    const galleryMatch = p.match(/^gallery\/([\w-]+)\/?$/)
    if (galleryMatch) {
      const cat = categoryFromSlug(galleryMatch[1])
      if (cat) persistSet('mr.galleryCat', cat)
      window.history.replaceState(null, '', window.location.pathname)
      return 'gallery'
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
  // Order matters: initialRoute() may persist mr.galleryCat from a deep link,
  // and the initializer below must read it back after that.
  const [route, setRoute] = useState<Route>(initialRoute)
  const [storyId, setStoryId] = useState(() => persistGet('mr.storyId', ''))
  const [storyTag, setStoryTag] = useState(() => persistGet('mr.storyTag', ''))
  const [galleryCat, setGalleryCat] = useState(
    () => categoryFromSlug(persistGet('mr.galleryCat', 'Motorsport')) ?? 'Motorsport'
  )

  useEffect(() => persistSet('mr.route', route), [route])
  useEffect(() => persistSet('mr.storyId', storyId), [storyId])
  useEffect(() => persistSet('mr.storyTag', storyTag), [storyTag])
  useEffect(() => persistSet('mr.galleryCat', galleryCat), [galleryCat])

  useEffect(() => {
    const dark = route === 'gallery' || route === 'story'
    document.body.setAttribute('data-section', dark ? 'dark' : 'light')
  }, [route])

  const go = (next: Route, ref?: string, tag?: string) => {
    if (next === route && !ref) return
    if (next === 'story' && ref) {
      setStoryId(ref)
      setStoryTag(tag ?? '')
    }
    if (next === 'gallery' && ref) setGalleryCat(ref)
    else if (next === 'gallery' && route === 'story') {
      // Header "galleria" from a story: land on that story's gallery page.
      const cat = eventById(storyId)?.category
      if (cat) setGalleryCat(cat)
    }
    setRoute(next)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  let screen: React.ReactNode = null
  if (route === 'cover') {
    screen = <Cover go={go} />
  } else if (route === 'gallery') {
    screen = <Gallery go={go} category={galleryCat} onCategory={setGalleryCat} />
  } else if (route === 'story') {
    screen = <PhotoStory key={storyId} eventId={storyId} tag={storyTag} go={go} />
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
