import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { DATA, slugOf } from './lib/data'
import type { GoFn } from './lib/data'
import TopBar from './components/TopBar'
import { Cover } from './pages/Cover'
import { Gallery, PhotoStory } from './pages/Gallery'
import DriveStory from './pages/DriveStory'
import Videos from './pages/Videos'
import Contact from './pages/Contact'
import RoomPage from './pages/Room'
import { categories, eventById, firstEventByTag } from './lib/events'
import { useDriveContent } from './hooks/useDriveContent'

type Theme = 'day' | 'night'

// Night mode: stored choice wins, otherwise follow the OS preference (the same
// value the inline script in index.html applies before first paint).
function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem('mr.theme')
    if (stored === 'night' || stored === 'day') return stored
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'night' : 'day'
}

// Maps the semantic go() of the views onto real paths: the router is the source
// of truth for the URL (deep-linkable, shareable, prerendered per page).
function useGo(): GoFn {
  const navigate = useNavigate()
  return useCallback<GoFn>(
    (next, ref, tag) => {
      if (next === 'story' && ref) {
        navigate(
          `/story/${encodeURIComponent(ref)}${tag ? `?t=${encodeURIComponent(tag)}` : ''}`
        )
      } else if (next === 'gallery') {
        navigate(ref ? `/gallery/${slugOf(ref)}` : '/gallery')
      } else {
        navigate(next === 'videos' ? '/videos' : next === 'contact' ? '/contact' : '/')
      }
    },
    [navigate]
  )
}

// The router decodes params already; this second pass only catches slugs that
// arrive double-encoded or with a dangling escape ("/gallery/50%") so a bad
// link degrades to the plain text instead of throwing mid-render.
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function GalleryRoute({ go }: { go: GoFn }) {
  const { cat } = useParams()
  const navigate = useNavigate()
  const drive = useDriveContent()

  // Static categories plus any category that exists only in the Drive archive
  // (e.g. a 'Sport' folder): the tab row grows as soon as the listing arrives.
  const allCategories = useMemo(() => {
    const extra = new Set((drive.content?.photoCollections ?? []).map((c) => c.category))
    const rest = [...extra].filter((c) => !categories.includes(c)).sort((a, b) => a.localeCompare(b))
    return [...categories, ...rest]
  }, [drive.content])

  const requested = (() => {
    if (!cat) return undefined
    const slug = safeDecode(cat)
    return allCategories.find((c) => c.toLowerCase() === slug.toLowerCase())
  })()

  // Bare /gallery keeps the last visited category (persisted); /gallery/<slug>
  // is the source of truth instead.
  const [storedRaw] = useState(() => {
    try {
      return localStorage.getItem('mr.galleryCat') ?? ''
    } catch {
      return ''
    }
  })
  // Resolve the persisted category against the current superset (static +
  // Drive-only tabs), falling back to Motorsport when it no longer exists.
  const storedCat = useMemo(
    () =>
      storedRaw && allCategories.some((c) => c.toLowerCase() === storedRaw.toLowerCase())
        ? storedRaw
        : 'Motorsport',
    [storedRaw, allCategories]
  )
  const category = requested ?? storedCat
  useEffect(() => {
    try {
      localStorage.setItem('mr.galleryCat', category)
    } catch {
      /* ignore */
    }
  }, [category])

  // A Drive-only category is resolvable only once the listing has settled:
  // wait for it before declaring the slug unknown. An error counts as settled —
  // the page renders the error state with a retry instead of hanging blank.
  // Static-category URLs (and the bare /gallery) never block on Drive.
  const driveSettled = !drive.configured || drive.content !== null || drive.error !== null
  useEffect(() => {
    if (cat && !requested && driveSettled && !drive.error) navigate('/gallery', { replace: true })
  }, [cat, requested, driveSettled, drive.error, navigate])

  const driveCollections = (drive.content?.photoCollections ?? []).filter(
    (c) => c.category === category
  )

  if (cat && !requested && !driveSettled) {
    return (
      <main className="section section-dark" style={{ paddingTop: 140, minHeight: '70vh' }}>
        <div className="container">
          <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
            Caricamento dall'archivio…
          </p>
        </div>
      </main>
    )
  }

  if (cat && !requested && drive.error) {
    return (
      <main className="section section-dark" style={{ paddingTop: 140, minHeight: '70vh' }}>
        <div className="container">
          <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
            {drive.error}{' '}
            <button onClick={drive.refresh} style={{ color: 'var(--accent-inverse)' }}>
              Riprova
            </button>{' '}
            ·{' '}
            <button onClick={() => go('gallery')} style={{ color: 'var(--accent-inverse)' }}>
              ← Galleria
            </button>
          </p>
        </div>
      </main>
    )
  }

  return (
    <Gallery
      go={go}
      category={category}
      categories={allCategories}
      driveCollections={driveCollections}
      onCategory={(c) => go('gallery', c)}
    />
  )
}

function StoryRoute({ go }: { go: GoFn }) {
  const { id } = useParams()
  const [params] = useSearchParams()
  const tag = params.get('t') ?? undefined
  const decoded = id ? safeDecode(id) : ''

  // Drive-backed collections live outside the static event manifests.
  if (decoded.startsWith('drive-')) {
    return <DriveStory key={decoded} collectionId={decoded} go={go} />
  }

  const known = decoded !== '' && (eventById(decoded) || firstEventByTag(decoded))
  // Unknown ids (stale links, typos) never render an empty story page.
  if (!known) return <Navigate to="/gallery" replace />
  return <PhotoStory key={decoded} eventId={decoded} tag={tag} go={go} />
}

function AppShell() {
  const location = useLocation()
  const go = useGo()
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'night' ? '#131313' : '#faf9f6')
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'night' ? 'day' : 'night'
    setTheme(next)
    try {
      localStorage.setItem('mr.theme', next)
    } catch {
      /* ignore */
    }
  }

  // The body follows the section (dark for gallery/story/videos) so route swaps
  // crossfade instead of flashing — see body[data-section] in index.css.
  const dark =
    location.pathname.startsWith('/gallery') ||
    location.pathname.startsWith('/story') ||
    location.pathname.startsWith('/videos') ||
    location.pathname.startsWith('/room')
  useEffect(() => {
    document.body.setAttribute('data-section', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <>
      <TopBar theme={theme} onToggleTheme={toggleTheme} />
      <div key={location.pathname} className="page-fade">
        <Routes>
          <Route path="/" element={<Cover go={go} />} />
          <Route path="/gallery" element={<GalleryRoute go={go} />} />
          <Route path="/gallery/:cat" element={<GalleryRoute go={go} />} />
          <Route path="/story/:id" element={<StoryRoute go={go} />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} {DATA.identity.name}</span>
        <span>{DATA.identity.location}</span>
        <a className="link-ext" href={`mailto:${DATA.identity.email}`}>Email</a>
        <span
          className="t-meta"
          style={{ flexBasis: '100%', fontSize: 10 }}
        >
          Nessun cookie, nessun tracciamento · foto e video dell'archivio serviti dai CDN di Google Drive
        </span>
      </footer>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  )
}
