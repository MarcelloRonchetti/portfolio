import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
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
import type { GoFn, Route as SiteRoute } from './lib/data'
import TopBar from './components/TopBar'
import { Cover } from './pages/Cover'
import { Gallery, PhotoStory } from './pages/Gallery'
import DriveStory from './pages/DriveStory'
import Videos from './pages/Videos'
import Contact from './pages/Contact'
import RoomPage from './pages/Room'
import { categories, eventById, firstEventByTag } from './lib/events'
import { useDriveContent } from './hooks/useDriveContent'
import { useCvDownload } from './hooks/useCvDownload'

// The rooms page pays for its chunk only when someone visits it.
const Experience = lazy(() => import('./pages/Experience'))

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
// Every navigation runs inside a View Transition (camera-push language: the
// page left behind zooms/fades, the new one settles from slight depth); on
// browsers without support the router falls back to the plain .page-fade.
function useGo(): GoFn {
  const navigate = useNavigate()
  return useCallback<GoFn>(
    (next, ref, tag) => {
      const vt = { viewTransition: true }
      if (next === 'story' && ref) {
        navigate(
          `/story/${encodeURIComponent(ref)}${tag ? `?t=${encodeURIComponent(tag)}` : ''}`,
          vt
        )
      } else if (next === 'gallery') {
        navigate(ref ? `/gallery/${slugOf(ref)}` : '/gallery', vt)
      } else {
        navigate(
          next === 'videos'
            ? '/videos'
            : next === 'contact'
              ? '/contact'
              : next === 'experience'
                ? '/experience'
                : '/',
          vt
        )
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
    if (cat && !requested && driveSettled && !drive.error) {
      navigate('/gallery', { replace: true, viewTransition: true })
    }
  }, [cat, requested, driveSettled, drive.error, navigate])

  const driveCollections = (drive.content?.photoCollections ?? []).filter(
    (c) => c.category === category
  )

  if (cat && !requested && !driveSettled) {
    return (
      <main className="section section-dark story-state-page">
        <div className="container">
          <div className="gl-state" role="status">
            <p className="gl-state-kicker">Archivio Drive</p>
            <p className="gl-state-text">Caricamento dall'archivio…</p>
          </div>
        </div>
      </main>
    )
  }

  if (cat && !requested && drive.error) {
    return (
      <main className="section section-dark story-state-page">
        <div className="container">
          <div className="gl-state" role="status">
            <p className="gl-state-kicker">Errore</p>
            <p className="gl-state-text">{drive.error}</p>
            <div className="gl-state-actions">
              <button className="gl-state-action" onClick={drive.refresh}>
                Riprova
              </button>
              <button className="gl-state-action" onClick={() => go('gallery')}>
                ← Galleria
              </button>
            </div>
          </div>
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
      driveError={drive.error}
      onDriveRetry={drive.refresh}
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
  // One download state for the whole shell: the header's CV button and the
  // Contact row are two views of the same download.
  const cv = useCvDownload()

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
    location.pathname.startsWith('/room') ||
    location.pathname.startsWith('/experience')

  // ── Site carousel ─────────────────────────────────────────────────────────
  // The main routes read as one continuous carousel (the reference site's
  // feel): wheel/swipe at the very top/bottom of a page moves to the adjacent
  // route with a View Transition, while the middle of a page scrolls
  // normally. /experience, /story and /room are out — they have their own
  // cameras and gesture surfaces.
  useEffect(() => {
    if (
      location.pathname.startsWith('/experience') ||
      location.pathname.startsWith('/story') ||
      location.pathname.startsWith('/room')
    ) {
      return
    }
    const ORDER: SiteRoute[] = ['cover', 'gallery', 'videos', 'contact']
    const current = ORDER.findIndex((r) =>
      r === 'cover'
        ? location.pathname === '/'
        : location.pathname.startsWith('/' + r)
    )
    if (current < 0) return

    const atTop = () => window.scrollY <= 2
    const atBottom = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
    const blocked = () =>
      document.querySelector('[aria-modal="true"], .lightbox, .video-lightbox')

    let acc = 0
    let lastWheel = 0
    let lockUntil = 0
    let touchStartY: number | null = null

    const move = (dir: 1 | -1) => {
      const nextIdx = (current + dir + ORDER.length) % ORDER.length
      go(ORDER[nextIdx])
    }
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || blocked()) return
      const now = performance.now()
      if (now < lockUntil) return
      if (now - lastWheel > 180) acc = 0
      lastWheel = now
      acc += e.deltaY
      // a deliberate flick (~2 detents) at a boundary turns the page; the
      // cover is the carousel start — its flick goes forward right away
      // (the footer would otherwise make the page "scrollable" by ~100px)
      const canDown = current === 0 ? true : atBottom()
      if (acc >= 240 && canDown) {
        acc = 0
        lockUntil = now + 1100
        move(1)
      } else if (acc <= -240 && atTop()) {
        acc = 0
        lockUntil = now + 1100
        move(-1)
      } else if (acc > 600 || acc < -600) {
        acc = 0 // keep the buffer bounded without firing
      }
    }
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) touchStartY = e.touches[0].clientY
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartY === null) return
      const dy = touchStartY - (e.changedTouches[0]?.clientY ?? touchStartY)
      touchStartY = null
      const now = performance.now()
      if (now < lockUntil || blocked()) return
      if (dy > 90 && atBottom()) move(1)
      else if (dy < -90 && atTop()) move(-1)
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [location.pathname, go])
  useEffect(() => {
    document.body.setAttribute('data-section', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <>
      {/* Primo elemento focusabile: la scorciatoia da tastiera salta la
          navigazione e porta il focus al contenuto della pagina. */}
      <a className="skip-link" href="#contenuto">
        Vai al contenuto
      </a>
      <TopBar theme={theme} onToggleTheme={toggleTheme} cv={cv} />
      <div key={location.pathname} className="page-fade" id="contenuto" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Cover go={go} />} />
          <Route path="/gallery" element={<GalleryRoute go={go} />} />
          <Route path="/gallery/:cat" element={<GalleryRoute go={go} />} />
          <Route path="/story/:id" element={<StoryRoute go={go} />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/contact" element={<Contact cv={cv} />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
          <Route
            path="/experience"
            element={
              <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#14120f' }} aria-hidden="true" />}>
                <Experience go={go} />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} {DATA.identity.name}</span>
        <span>{DATA.identity.location}</span>
        <a className="link-ext" href={`mailto:${DATA.identity.email}`}>Email</a>
        <span className="footer-note">
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
