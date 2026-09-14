// Round-3 data polish:
// - replaces collage Instagram covers with a clean single frame (cover.jpg only,
//   the original photo files are left untouched)
// - disambiguates duplicate titles with the event month
// - clears stale subtitles, removes the duplicate "Modena" tag, rewords two
//   encyclopedia-style descriptions
// Idempotent. Run: node scripts/polish-events.mjs [--dry-run]
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const PHOTOS = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../public/photos')
const DRY = process.argv.includes('--dry-run')

// cover.jpg è un collage a più pannelli → usa la prima foto singola dell'evento.
const COVER_FROM = {
  'zanasi-racing-ferrari-296-challenge-in-2026-ferrari': '01.jpg',
  'lotus-2026-lotus': '01.jpg',
  'lotus-s2-2026-lotus': '01.jpg',
  'yellow-lamborghini-revuelto-2026-lamborghini': '01.jpg',
  'ferrari-invasion-in-imola-2026-ferrari': '01.jpg',
}

const MESI = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

const DESCRIPTIONS = {
  'lamborghini-murcielago-class-2001-but-2025-lamborghini':
    'Una Murciélago con il suo V12 da oltre 500 CV.',
  'the-lamborghini-countach-is-a-legendary-2025-lamborghini':
    'Una Countach di Marcello Gandini: design futuristico, produzione 1974–1990.',
}

const SET_TAGS = {
  'pagani-utopia-makes-an-appearance-in-2025-pagani': ['Pagani'],
}
const SET_SUBTITLE = {
  'some-formula-2000-flying-on-track-2026-supercar': 'Formula 2000',
}

const read = (id) => JSON.parse(fs.readFileSync(path.join(PHOTOS, id, 'event.json'), 'utf8'))
const write = (id, ev) => {
  if (!DRY) fs.writeFileSync(path.join(PHOTOS, id, 'event.json'), JSON.stringify(ev, null, 2) + '\n')
}

// 1. cover collage → singola foto
for (const [id, file] of Object.entries(COVER_FROM)) {
  const src = path.join(PHOTOS, id, file)
  const dst = path.join(PHOTOS, id, 'cover.jpg')
  if (fs.existsSync(src)) {
    if (!DRY) fs.copyFileSync(src, dst)
    console.log(`cover  ${id}: cover.jpg ← ${file}`)
  } else {
    console.log(`cover  ${id}: MANCA ${file}, salto`)
  }
}

// 2. titoli duplicati → disambigua con il mese
const all = fs.readdirSync(PHOTOS).filter((d) => fs.existsSync(path.join(PHOTOS, d, 'event.json')))
const byTitle = new Map()
for (const id of all) {
  const ev = read(id)
  const list = byTitle.get(ev.title) ?? []
  list.push(id)
  byTitle.set(ev.title, list)
}
for (const [title, ids] of byTitle) {
  if (ids.length < 2) continue
  for (const id of ids) {
    const ev = read(id)
    const month = MESI[parseInt(ev.date.slice(5, 7), 10)] ?? ''
    if (!month) continue
    ev.title = title.replace(/, (\d{4})$/, ` — ${month} $1`)
    write(id, ev)
    console.log(`titolo ${id}: ${JSON.stringify(title)} → ${JSON.stringify(ev.title)}`)
  }
}

// 3. tag/subtitle/descrizioni
for (const [id, tags] of Object.entries(SET_TAGS)) {
  const ev = read(id)
  if (JSON.stringify(ev.tags) !== JSON.stringify(tags)) {
    ev.tags = tags
    write(id, ev)
    console.log(`tag    ${id}: → ${JSON.stringify(tags)}`)
  }
}
for (const [id, sub] of Object.entries(SET_SUBTITLE)) {
  const ev = read(id)
  if (ev.subtitle !== sub) {
    ev.subtitle = sub
    write(id, ev)
    console.log(`sub    ${id}: → ${JSON.stringify(sub)}`)
  }
}
for (const [id, desc] of Object.entries(DESCRIPTIONS)) {
  const ev = read(id)
  if (ev.description_it !== desc) {
    ev.description_it = desc
    write(id, ev)
    console.log(`desc   ${id}`)
  }
}
console.log((DRY ? 'DRY RUN — nessuna scrittura' : 'fatto'))
