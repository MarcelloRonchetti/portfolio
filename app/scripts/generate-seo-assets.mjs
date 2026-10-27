// Build-time SEO/AI asset generator. Runs after `vite build` and produces:
//
//   1. dist/sitemap.xml — every page at its pretty URL.
//   2. Prerendered pages under dist/story/<id>/, dist/gallery/<slug>/,
//      dist/gallery/, dist/videos/, dist/contact/ — each is a CLONE of the SPA
//      shell (same hashed bundle) with per-page <title>, description, canonical,
//      Open Graph and JSON-LD, plus a noscript summary for crawlers that don't
//      execute JS. Visitors get the full interactive site directly on the pretty
//      URL (the router reads location.pathname); crawlers without JS get real
//      per-URL content instead of the bare shell.
//   3. dist/index.html (the SPA shell) — post-processed to add Open Graph tags
//      with the current hero image (latest Instagram post).
//
// Never commit the generated files: the daily Instagram import bot adds events,
// so everything here regenerates on every build.
//
// Event normalization mirrors src/lib/events.ts exactly: skip events the app
// would skip (missing title/year/tags/date), legacy `tag` fallback, category
// defaults to Motorsport. Story ids must match the /story/:id route ids
// (`^[\w-]+$`), which also covers Drive-backed collections (`drive-<folderId>`).
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..')
const PHOTOS = path.join(ROOT, 'public/photos')
const DIST = path.join(ROOT, 'dist')
const SITE = 'https://marcelloronchetti.github.io/portfolio'
const SITE_NAME = 'Marcello Ronchetti — Fotografo Sport & Motorsport'
const SITE_DESC =
  'Portfolio fotografico di Marcello Ronchetti: sport, motorsport e reportage da circuiti, eventi e viaggi.'
const IDENTITY = {
  name: 'Marcello Ronchetti',
  role: 'Fotografo — Sport & Motorsport',
  location: 'Modena, Italia',
  email: 'ronchettimarcello@gmail.com',
  instagram: 'https://www.instagram.com/marc.roads/',
  tiktok: 'https://www.tiktok.com/@marc.roads',
}
const STORY_ID_RE = /^[\w-]+$/
// Exact strings from app/index.html that get replaced per page. The shell's
// canonical is itself an anchor: it gets REPLACED by the per-page canonical (a
// second canonical alongside it would conflict and be ignored by Google).
const SHELL_TITLE = 'Marcello Ronchetti — Fotografo Sport & Motorsport'
const SHELL_DESC = 'Marcello Ronchetti — fotografo di sport e motorsport. Raccolte, eventi e contatti.'
const SHELL_CANONICAL = '<link rel="canonical" href="https://marcelloronchetti.github.io/portfolio/" />'
const LD_RE = /<script type="application\/ld\+json">[\s\S]*?<\/script>/

function readEvents() {
  const events = []
  for (const id of fs.readdirSync(PHOTOS)) {
    if (!STORY_ID_RE.test(id)) continue
    const manifest = path.join(PHOTOS, id, 'event.json')
    if (!fs.existsSync(manifest)) continue
    const raw = JSON.parse(fs.readFileSync(manifest, 'utf8'))
    const tags = raw.tags?.length ? raw.tags : raw.tag ? [raw.tag] : []
    if (!raw.title || !raw.year || tags.length === 0 || !raw.date) continue
    events.push({
      id,
      title: raw.title,
      year: raw.year,
      date: raw.date,
      description: raw.description_it || '',
      category: raw.category || 'Motorsport',
      cover: raw.cover || 'cover.jpg',
      nPhotos: (raw.photos ?? []).length,
      source: raw.source ?? {},
    })
  }
  return events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

const escHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// Inline ld+json bodies must not contain "</script"; \u003c is valid JSON.
const escJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c')

function siteGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: `${SITE}/`,
        name: SITE_NAME,
        inLanguage: 'it',
        description: SITE_DESC,
        publisher: { '@id': `${SITE}/#person` },
      },
      {
        '@type': 'Person',
        '@id': `${SITE}/#person`,
        name: IDENTITY.name,
        jobTitle: 'Fotografo',
        description: `Fotografo di sport e motorsport con sede a ${IDENTITY.location}.`,
        url: `${SITE}/`,
        email: `mailto:${IDENTITY.email}`,
        homeLocation: { '@type': 'Place', name: IDENTITY.location },
        knowsAbout: [
          'Fotografia motorsport',
          'Fotografia sportiva',
          'Fotografia di paesaggio',
          'Reportage fotografico',
        ],
        sameAs: [IDENTITY.instagram, IDENTITY.tiktok],
      },
    ],
  }
}

// Writes dist/<dir>/index.html: the shell with per-page meta. The router picks
// the right view from the URL — no localStorage seeding needed anymore.
function page({ dir, title, description, canonical, ogImage, jsonLd, noscript }) {
  let html = SHELL
    .replace(`<title>${SHELL_TITLE}</title>`, () => `<title>${escHtml(title)}</title>`)
    .replace(`content="${SHELL_DESC}"`, () => `content="${escHtml(description)}"`)
    .replace(
      SHELL_CANONICAL,
      () =>
        `<link rel="canonical" href="${escHtml(canonical)}" />\n    ${ogBlock(title, description, canonical, ogImage)}`
    )
    .replace(
      LD_RE,
      () => `<script type="application/ld+json">\n      ${escJson(jsonLd)}\n    </script>`
    )
    .replace(
      '<div id="root"></div>',
      () => `<div id="root"></div>
    <noscript>
      ${noscript}
    </noscript>`
    )
  fs.mkdirSync(path.join(DIST, dir), { recursive: true })
  fs.writeFileSync(path.join(DIST, dir, 'index.html'), html)
}

function ogBlock(title, description, canonical, ogImage) {
  const lines = [
    `<meta property="og:title" content="${escHtml(title)}" />`,
    `<meta property="og:description" content="${escHtml(description)}" />`,
    `<meta property="og:url" content="${escHtml(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escHtml(SITE_NAME)}" />`,
  ]
  if (ogImage) lines.push(`<meta property="og:image" content="${escHtml(ogImage)}" />`)
  lines.push(`<meta name="twitter:card" content="summary_large_image" />`)
  return lines.join('\n    ') + '\n    '
}

const today = new Date().toISOString().slice(0, 10)
const events = readEvents()
const SHELL = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
if (
  !SHELL.includes(SHELL_TITLE) ||
  !SHELL.includes(`content="${SHELL_DESC}"`) ||
  !SHELL.includes(SHELL_CANONICAL) ||
  !LD_RE.test(SHELL) ||
  !SHELL.includes('<div id="root"></div>')
) {
  console.error('seo: dist/index.html non corrisponde al template atteso — aggiornare gli anchor in generate-seo-assets.mjs')
  process.exit(1)
}

// Category aggregation: Motorsport first (the site's core), rest alphabetical —
// same order as src/lib/events.ts.
const cats = new Map()
for (const e of events) {
  const c = cats.get(e.category) ?? { n: 0, lastmod: '', photos: 0 }
  c.n += 1
  c.photos += e.nPhotos
  if (e.date > c.lastmod) c.lastmod = e.date
  cats.set(e.category, c)
}
const categories = [...cats.keys()].sort((a, b) => {
  if (a === 'Motorsport') return -1
  if (b === 'Motorsport') return 1
  return a.localeCompare(b)
})
const slugOf = (cat) => encodeURIComponent(cat.toLowerCase())

// ── 1. Prerendered story pages ───────────────────────────────────────────────
// Events with no photos have no gallery to show: prerendering them would put
// indexable junk pages (numberOfItems: 0) into the sitemap. They stay reachable
// through the app's ?p= deep links.
const prunable = events.filter((e) => e.nPhotos > 0)
for (const e of prunable) {
  const description =
    e.description ||
    `Raccolta fotografica di ${IDENTITY.name}: ${e.title}. ${e.nPhotos} foto sul portfolio.`
  page({
    dir: `story/${e.id}`,
    title: `${e.title} — ${IDENTITY.name}`,
    description,
    canonical: `${SITE}/story/${e.id}/`,
    ogImage: `${SITE}/photos/${e.id}/${e.cover}`,
    jsonLd: {
      ...siteGraph(),
      '@graph': [
        ...siteGraph()['@graph'],
        {
          '@type': 'ImageGallery',
          '@id': `${SITE}/story/${e.id}/#gallery`,
          url: `${SITE}/story/${e.id}/`,
          name: e.title,
          description,
          dateCreated: e.date,
          creator: { '@id': `${SITE}/#person` },
          numberOfItems: e.nPhotos,
          associatedMedia: {
            '@type': 'ImageObject',
            contentUrl: `${SITE}/photos/${e.id}/${e.cover}`,
          },
        },
      ],
    },
    noscript: `<h1>${escHtml(e.title)}</h1>
        <p>${escHtml(description)}</p>
        <p><img src="${escHtml(`${SITE}/photos/${e.id}/${e.cover}`)}" alt="${escHtml(e.title)}" /></p>
        <p>Fotografie di ${escHtml(IDENTITY.name)} — <a href="${escHtml(`${SITE}/story/${e.id}/`)}">Apri la raccolta completa</a></p>`,
  })
}

// ── 2. Prerendered gallery / category / videos / contact pages ───────────────
page({
  dir: 'gallery',
  title: `Galleria — ${IDENTITY.name}`,
  description: `Tutte le raccolte fotografiche di ${IDENTITY.name} (${categories.join(', ')}). Raccolte da circuiti, eventi e viaggi.`,
  canonical: `${SITE}/gallery/`,
  jsonLd: siteGraph(),
  noscript: `<h1>Galleria</h1><p>Raccolte da circuiti, eventi e viaggi. Categorie: ${escHtml(categories.join(', '))}.</p>`,
})
for (const cat of categories) {
  const c = cats.get(cat)
  page({
    dir: `gallery/${slugOf(cat)}`,
    title: `${cat} — Galleria — ${IDENTITY.name}`,
    description: `Galleria ${cat} di ${IDENTITY.name}: ${c.n} raccolte, ${c.photos} foto.`,
    canonical: `${SITE}/gallery/${slugOf(cat)}/`,
    jsonLd: siteGraph(),
    noscript: `<h1>Galleria — ${escHtml(cat)}</h1><p>${c.n} raccolte, ${c.photos} foto.</p>`,
  })
}
page({
  dir: 'videos',
  title: `Video — ${IDENTITY.name}`,
  description: `I video di ${IDENTITY.name}, fotografo di sport e motorsport: filmati dall'archivio in qualità HD (minimo 720p).`,
  canonical: `${SITE}/videos/`,
  jsonLd: siteGraph(),
  noscript: `<h1>Video</h1><p>I filmati dell'archivio di ${escHtml(IDENTITY.name)}, in qualità HD (minimo 720p).</p>`,
})
page({
  dir: 'contact',
  title: `Contatti — ${IDENTITY.name}`,
  description: `Contatti di ${IDENTITY.name}, fotografo a ${IDENTITY.location}: email, Instagram e TikTok per informazioni, commissioni e collaborazioni.`,
  canonical: `${SITE}/contact/`,
  jsonLd: siteGraph(),
  noscript: `<h1>Contatti</h1>
        <p>Per informazioni, commissioni o collaborazioni:</p>
        <p>Email: <a href="mailto:${IDENTITY.email}">${escHtml(IDENTITY.email)}</a></p>
        <p>Instagram: <a href="${IDENTITY.instagram}">${escHtml(IDENTITY.instagram)}</a></p>
        <p>TikTok: <a href="${IDENTITY.tiktok}">${escHtml(IDENTITY.tiktok)}</a></p>`,
})

// ── 3. sitemap.xml — pretty URLs only ────────────────────────────────────────
const entry = (loc, lastmod) =>
  `  <url>\n    <loc>${escHtml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>\n`
let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
xml += entry(`${SITE}/`, today)
xml += entry(`${SITE}/gallery/`, today)
for (const cat of categories) xml += entry(`${SITE}/gallery/${slugOf(cat)}/`, cats.get(cat).lastmod)
xml += entry(`${SITE}/videos/`, today)
xml += entry(`${SITE}/contact/`, today)
for (const e of prunable) xml += entry(`${SITE}/story/${e.id}/`, e.date)
xml += '</urlset>\n'
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml)

// ── 4. Open Graph + LCP preload on the SPA shell (root) ─────────────────────
// The hero is always the latest Instagram post that is not a VIDEO (same rule
// as src/lib/events.ts featuredEvent); fall back to the newest event. The
// preload is shell-only: on inner pages the hero image isn't the LCP.
const heroEvent =
  events.find((e) => e.source.provider === 'instagram' && e.source.media_type !== 'VIDEO') ??
  events[0]
const heroImage = `${SITE}/photos/${heroEvent.id}/${heroEvent.cover}`
const shellPath = path.join(DIST, 'index.html')
let shellHtml = fs.readFileSync(shellPath, 'utf8')
if (!shellHtml.includes('property="og:title"')) {
  shellHtml = shellHtml.replace(
    '</head>',
    () =>
      ogBlock(SHELL_TITLE, SITE_DESC, `${SITE}/`, heroImage) +
      `  <link rel="preload" as="image" href="${escHtml(heroImage)}" fetchpriority="high" />\n  </head>`
  )
  fs.writeFileSync(shellPath, shellHtml)
}

console.log(
  `seo: sitemap ${prunable.length} eventi + ${categories.length} categorie; ${prunable.length + categories.length + 3} pagine prerenderizzate; og:image da ${heroEvent.id}`
)
