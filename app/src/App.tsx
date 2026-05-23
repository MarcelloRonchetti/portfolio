import { useEffect, useState } from 'react'
import type { Route } from './lib/data'
import TopBar from './components/TopBar'
import BottomBar from './components/BottomBar'
import CustomCursor from './components/CustomCursor'
import { Curtain, useCurtain } from './components/Curtain'
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

function sealForRoute(route: Route): string {
  switch (route) {
    case 'cover': return 'MR'
    case 'tech': return 'I'
    case 'project': return 'I·a'
    case 'foto': return 'II'
    case 'story': return 'II·a'
    case 'about': return 'III'
    case 'contact': return 'V'
    default: return 'MR'
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => persistGet('mr.route', 'cover') as Route)
  const [projectId, setProjectId] = useState(() => persistGet('mr.projectId', 'greenhouse-controller'))
  const [storyId, setStoryId] = useState(() => persistGet('mr.storyId', persistGet('mr.storyTag', 'MotoGP')))
  const [lang, setLang] = useState<'IT' | 'EN'>(() => (persistGet('mr.lang', 'IT') as 'IT' | 'EN'))
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (persistGet('mr.theme', 'light') as 'light' | 'dark'))

  useEffect(() => persistSet('mr.route', route), [route])
  useEffect(() => persistSet('mr.projectId', projectId), [projectId])
  useEffect(() => persistSet('mr.storyId', storyId), [storyId])
  useEffect(() => persistSet('mr.lang', lang), [lang])
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
    const seal = sealForRoute(next)
    await curtain.transition(seal, () => {
      if (next === 'project' && ref) setProjectId(ref)
      if (next === 'story' && ref) setStoryId(ref)
      setRoute(next)
      window.scrollTo({ top: 0, behavior: 'instant' })
    })
  }

  let screen: React.ReactNode = null
  let pageNum = '01'
  let scrollHint = 'sfoglia'
  let pager: React.ReactNode = null

  if (route === 'cover') {
    screen = (
      <>
        <Cover go={(next) => go(next)} />
        <Preface go={(next) => go(next)} />
      </>
    )
    pageNum = '01'
    scrollHint = 'sfoglia la prefazione'
    pager = <span style={{ color: 'var(--brass)' }}>I · II · III →</span>
  } else if (route === 'tech') {
    screen = <ChapterTech go={(next, ref) => go(next, ref)} />
    pageNum = '04'
    scrollHint = 'capitolo primo'
    pager = <span style={{ color: 'var(--brass)' }}>← I  ·  II →</span>
  } else if (route === 'project') {
    screen = <ProjectDetail projectId={projectId} go={(next, ref) => go(next, ref)} />
    pageNum = '06'
    scrollHint = 'caso studio'
  } else if (route === 'foto') {
    screen = <ChapterFoto go={(next, ref) => go(next, ref)} />
    pageNum = '18'
    scrollHint = 'capitolo secondo'
    pager = <span style={{ color: 'var(--brass)' }}>← I  ·  II →</span>
  } else if (route === 'story') {
    screen = <PhotoStory eventId={storyId} go={(next, ref) => go(next, ref)} />
    pageNum = '22'
    scrollHint = 'foglio contatto'
  } else if (route === 'about' || route === 'contact') {
    screen = <Placeholder route={route} go={(next) => go(next)} />
    pageNum = route === 'about' ? '30' : '38'
    scrollHint = route
  }

  return (
    <>
      <TopBar
        route={route}
        onNavigate={(next) => go(next)}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
      />

      {screen}

      <BottomBar page={pageNum} hint={scrollHint} pager={pager} />

      <Curtain state={curtain.state} seal={curtain.seal} />
      <CustomCursor />
    </>
  )
}
