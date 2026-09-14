import { useEffect, useState } from 'react'
import type { Route } from './lib/data'
import { ROUTE_META } from './lib/data'
import TopBar from './components/TopBar'
import BottomBar from './components/BottomBar'
import CustomCursor from './components/CustomCursor'
import { Curtain } from './components/Curtain'
import { useCurtain } from './components/useCurtain'
import { Cover, Preface } from './pages/Cover'
import { ChapterTech, ProjectDetail } from './pages/ChapterTech'
import { ChapterFoto, PhotoStory } from './pages/ChapterFoto'
import Placeholder from './pages/Placeholder'

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
function initialRoute(): Route {
  const ROUTES: Route[] = ['cover', 'tech', 'project', 'foto', 'story', 'about', 'contact']
  try {
    const p = new URLSearchParams(window.location.search).get('p')
    const path = (p ?? '').replace(/\/+$/, '').replace(/^\//, '')
    if (ROUTES.includes(path as Route)) {
      window.history.replaceState(null, '', window.location.pathname)
      return path as Route
    }
  } catch {
    /* ignore */
  }
  return persistGet('mr.route', 'cover') as Route
}

export default function App() {
  const [route, setRoute] = useState<Route>(initialRoute)
  const [projectId, setProjectId] = useState(() => persistGet('mr.projectId', 'greenhouse-controller'))
  const [storyId, setStoryId] = useState(() => persistGet('mr.storyId', persistGet('mr.storyTag', 'MotoGP')))
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (persistGet('mr.theme', 'light') as 'light' | 'dark'))

  useEffect(() => persistSet('mr.route', route), [route])
  useEffect(() => persistSet('mr.projectId', projectId), [projectId])
  useEffect(() => persistSet('mr.storyId', storyId), [storyId])
  useEffect(() => {
    persistSet('mr.theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const dark = route === 'foto' || route === 'story'
    document.body.setAttribute('data-section', dark ? 'dark' : 'light')
  }, [route])

  const curtain = useCurtain()

  const go = async (next: Route, ref?: string) => {
    if (next === route && !ref) return
    await curtain.transition(ROUTE_META[next].seal, () => {
      if (next === 'project' && ref) setProjectId(ref)
      if (next === 'story' && ref) setStoryId(ref)
      setRoute(next)
      window.scrollTo({ top: 0, behavior: 'instant' })
    })
  }

  let screen: React.ReactNode = null
  const scrollHint = ROUTE_META[route].hint

  if (route === 'cover') {
    screen = (
      <>
        <Cover go={(next) => go(next)} />
        <Preface go={(next) => go(next)} />
      </>
    )
  } else if (route === 'tech') {
    screen = <ChapterTech go={(next, ref) => go(next, ref)} />
  } else if (route === 'project') {
    screen = <ProjectDetail projectId={projectId} go={(next, ref) => go(next, ref)} />
  } else if (route === 'foto') {
    screen = <ChapterFoto go={(next, ref) => go(next, ref)} />
  } else if (route === 'story') {
    screen = <PhotoStory eventId={storyId} go={(next, ref) => go(next, ref)} />
  } else if (route === 'about' || route === 'contact') {
    screen = <Placeholder route={route} go={(next) => go(next)} />
  }

  return (
    <>
      <TopBar
        route={route}
        onNavigate={(next) => go(next)}
        theme={theme}
        setTheme={setTheme}
      />

      {screen}

      <BottomBar page={ROUTE_META[route].page} hint={scrollHint} />

      <Curtain state={curtain.state} seal={curtain.seal} />
      <CustomCursor />
    </>
  )
}
