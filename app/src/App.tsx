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
import { DATA, slugOf, isRailPath } from './lib/data'
import type { GoFn } from './lib/data'
import { vtNavigate } from './lib/vtNavigate'
import { consumeStoryHero } from './lib/vtHero'
import TopBar from './components/TopBar'
import DustCanvas from './components/DustCanvas'
import SiteRail3d from './components/SiteRail3d'
import { usePointerParallax } from './hooks/usePointerParallax'
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
// Rail → rail (le quattro facce principali): navigate PLANA — la camera del
// rail È la transizione. Entrare/uscire dal rail (storie, room, /experience):
// manual View Transition (vtNavigate — l'opzione viewTransition del router non
// ha mai chiamato l'API qui).
function useGo(): GoFn {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return useCallback<GoFn>(
    (next, ref, tag) => {
      let path: string
      if (next === 'story' && ref) {
        path = `/story/${encodeURIComponent(ref)}${tag ? `?t=${encodeURIComponent(tag)}` : ''}`
      } else if (next === 'gallery') {
        path = ref ? `/gallery/${slugOf(ref)}` : '/gallery'
      } else {
        path =
          next === 'videos'
            ? '/videos'
            : next === 'contact'
              ? '/contact'
              : next === 'experience'
                ? '/experience'
                : '/'
      }
      if (isRailPath(path) && isRailPath(pathname)) navigate(path)
      else vtNavigate(navigate, path)
    },
    [navigate, pathname]
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

function GalleryRoute({ go, cat, active = true }: { go: GoFn; cat?: string; active?: boolean }) {
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
  // Il redirect resta nel rail (plano): la camera non deve saltare.
  const driveSettled = !drive.configured || drive.content !== null || drive.error !== null
  useEffect(() => {
    if (cat && !requested && driveSettled && !drive.error) {
      navigate('/gallery', { replace: true })
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
      live={active}
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
  // Unknown ids (stale links, typos) never render an empty story page. A
  // morph id left by a card click is discarded here: a stale id must never
  // leak into the next story mount.
  if (!known) {
    consumeStoryHero()
    return <Navigate to="/gallery" replace />
  }
  return <PhotoStory key={decoded} eventId={decoded} tag={tag} go={go} />
}

// Footer per-faccia del rail: vive DENTRO ogni faccia (la faccia è una pagina
// intera che scorre); fuori dal rail il footer globale torna di casa sua.
function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} {DATA.identity.name}</span>
      <span>{DATA.identity.location}</span>
      <a className="link-ext" href={`mailto:${DATA.identity.email}`}>Email</a>
      <span className="footer-note">
        Nessun cookie, nessun tracciamento · foto e video dell'archivio serviti dai CDN di Google Drive
      </span>
    </footer>
  )
}

function AppShell() {
  const location = useLocation()
  const go = useGo()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(initialTheme)
  // One download state for the whole shell: the header's CV button and the
  // Contact row are two views of the same download.
  const cv = useCvDownload()
  // Parallasse del puntatore: scrive --px/--py su <body> per le pozze
  // (.ambient), l'hero di Cover e i bagliori delle storie.
  usePointerParallax()

  // Il rail 3D è il guscio delle quattro facce principali. Chi viaggia con
  // prefers-reduced-motion resta sul sito instradato classico (page-fade):
  // deciso una volta per sessione, al mount.
  const [railEnabled] = useState(
    () => !(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  )
  const railActive = railEnabled && isRailPath(location.pathname)

  // Navigazione consapevole del rail (header): rail → rail la camera fa già
  // la transizione; fuori e dentro il rail passa dalla View Transition.
  const navTo = useCallback(
    (path: string) => {
      if (isRailPath(path) && isRailPath(location.pathname)) navigate(path)
      else vtNavigate(navigate, path)
    },
    [navigate, location.pathname]
  )

  // La categoria galleria arriva dal path (deep link /gallery/<slug>): fuori
  // dalle Routes non c'è useParams, si parsa qui.
  const catMatch = location.pathname.match(/^\/gallery\/([^/]+)/)
  const catParam = catMatch ? safeDecode(catMatch[1]) : undefined

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
  // Nel rail il vuoto fra le facce è sempre scuro, copertina inclusa.
  const dark =
    railActive ||
    location.pathname.startsWith('/gallery') ||
    location.pathname.startsWith('/story') ||
    location.pathname.startsWith('/videos') ||
    location.pathname.startsWith('/room') ||
    location.pathname.startsWith('/experience')

  useEffect(() => {
    document.body.setAttribute('data-section', dark ? 'dark' : 'light')
  }, [dark])

  // Le sale immersive portano la propria luce: le pozze generiche e la
  // polvere si ritirano (la grana resta — è pellicola, ovunque).
  const ownLight = location.pathname.startsWith('/experience')
  useEffect(() => {
    document.body.setAttribute('data-ambient', ownLight ? 'off' : 'on')
  }, [ownLight])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  // Le quattro facce del rail: sempre montate (la faccia uscente resta in
  // scena mentre la camera se ne va), ognuna chiude con il proprio footer —
  // tranne la copertina: è un manifesto a tutta faccia, il suo footer sarebbe
  // irraggiungibile (ogni input in avanti gira la camera) e le info vivono
  // nella faccia contatti.
  // La faccia viva (per l'eager/LCP della galleria): stampata dal path al
  // mount, poi tenuta al passo da SiteRail3d via onActiveChange.
  const [railFace, setRailFace] = useState<number>(() =>
    location.pathname.startsWith('/gallery')
      ? 1
      : location.pathname.startsWith('/videos')
        ? 2
        : location.pathname.startsWith('/contact')
          ? 3
          : 0
  )
  const railFaces = [
    <Cover go={go} />,
    <GalleryRoute go={go} cat={catParam} active={railFace === 1} />,
    <><Videos /><SiteFooter /></>,
    <><Contact cv={cv} /><SiteFooter /></>,
  ]

  return (
    <>
      {/* Primo elemento focusabile: la scorciatoia da tastiera salta la
          navigazione e porta il focus al contenuto della pagina. */}
      <a className="skip-link" href="#contenuto">
        Vai al contenuto
      </a>
      {/* Strati ambientali FISSI fuori dal wrapper .page-fade (che tiene un
          transform: i fixed figli si centrerebbero sul documento, non sulla
          viewport) e fuori dal remount per route: pozze e polvere non si
          azzerano mai navigando. */}
      <div className="ambient" aria-hidden="true" />
      <DustCanvas />
      <TopBar theme={theme} onToggleTheme={toggleTheme} cv={cv} navTo={navTo} />
      {railActive ? (
        <SiteRail3d faces={railFaces} onActiveChange={setRailFace} />
      ) : (
        <div key={location.pathname} className="page-fade" id="contenuto" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Cover go={go} />} />
            <Route path="/gallery" element={<GalleryRoute go={go} cat={catParam} />} />
            <Route path="/gallery/:cat" element={<GalleryRoute go={go} cat={catParam} />} />
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
          <SiteFooter />
        </div>
      )}
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
