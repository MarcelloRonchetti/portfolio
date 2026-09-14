// One-off repair of the Instagram-imported event manifests.
// The import (prose skill rules) was applied inconsistently: titles cut mid-sentence
// at 40 chars, emoji/#hashtags/@mentions left in titles, "..."-spacer trains and
// trailing hashtag blocks kept in descriptions, an AI-generated caption dump kept whole.
//
// Deterministic rules fix the majority; `overrides` handles the handful that need
// editorial judgment. Run with --dry-run to preview; no second arg applies changes.
//
//   node scripts/clean-events.mjs --dry-run
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const PHOTOS = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../public/photos')
const DRY = process.argv.includes('--dry-run')

// Events removed outright: two curated seeds with zero photos (hero 404) and the
// near-duplicate second post of the #50 Ferrari WEC pair (merged into its twin).
const REMOVE = ['mugello-2025-motogp', 'sardegna-2025-wrc', '50-wec-ferrari-2025-ferrari']
const MERGE_INTO = { '50-wec-ferrari-2025-ferrari': { into: '50-ferrari-wec-2024-2025-ferrari' } }

const PLACES = { imola: 'Imola', modena: 'Modena', mugello: 'Mugello' }
const BRANDS = [
  ['lamborghini', 'Lamborghini'], ['maclaren', 'McLaren'], ['mclaren', 'McLaren'],
  ['ferrari', 'Ferrari'], ['porsche', 'Porsche'], ['maserati', 'Maserati'],
  ['pagani', 'Pagani'], ['ducati', 'Ducati'], ['corvette', 'Corvette'],
  ['honda', 'Honda'], ['lotus', 'Lotus'], ['bmw', 'BMW'],
  ['imola', 'Imola'], ['modena', 'Modena'], ['mugello', 'Mugello'],
]
const DANGLING = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
  'but', 'like', 'is', 'was', 'are', 'di', 'il', 'la', 'che', 'con', 'del',
  'dei', 'su', 'per', 'da',
])

// Editorial fixes where the rules can't produce a complete, honest title/description.
const overrides = {
  'mountains-2025-reportage': { title: 'Mountains' },
  'photograpy-2025-reportage': { title: 'Photography' },
  'travel-2025-reportage': { title: 'Travel' },
  'this-honda-kinda-looks-2025-honda': { title: 'Honda Civic' },
  'the-chicken-was-still-warm-2025-porsche': {
    title: 'The chicken was still warm',
    // caption was a pasted ChatGPT answer — keep only the actual caption line
    description_it: '',
  },
  'the-mclaren-artura-trophy-evo-of-2026-mclaren': {
    title: 'The McLaren Artura Trophy Evo of Target Racing',
  },
  '50-ferrari-wec-2024-2025-ferrari': { title: 'Ferrari #50 · WEC 2024', description_it: '' },
  'n-8-are-t-mac-racing-parkertracing-2026-bmw': { title: 'N 8, N 23, N 55' },
  'la-ferrari-296-challenge-ferita-di-2026-ferrari': {
    title: 'La Ferrari 296 Challenge ferita di Spirit of Racing',
  },
  'some-othe-cool-and-shiny-cars-in-the-2025-supercar': {
    title: 'Some other cool and shiny cars in the night',
  },
  'the-biggest-tragedy-in-life-is-that-2025-reportage': { title: 'The biggest tragedy in life' },
  'the-lamborghini-countach-is-a-legendary-2025-lamborghini': {
    title: 'The Lamborghini Countach is a legendary Italian supercar',
  },
  'kickstarting-autumn-with-awesome-group-2025-bmw': {
    title: 'Kickstarting autumn with awesome group shots',
  },
  'maserati-fuoriserie-2025-maserati': { description_it: 'Maserati Fuoriserie' },
  'maserati-gt-folgore-2025-maserati': { description_it: 'Maserati GT Folgore' },
  'we-re-so-back-with-a-maclaren-2025-mclaren': { title: "We're so back… with a McLaren" },
}

// Instagram flag emoji are regional indicators, not Extended_Pictographic — spell them out.
const EMOJI = '[\\p{Extended_Pictographic}\\u{1F1E6}-\\u{1F1FF}\\u{FE0F}\\u{200D}\\u{20E3}]'
const EMOJI_RE = new RegExp(EMOJI, 'gu')

const stripNoise = (s) =>
  s
    .replace(new RegExp(EMOJI, 'gu'), '')
    .replace(/(?:^|\s)\S*#\S+/g, ' ')
    .replace(/(?:^|\s)@[\w.]+/g, ' ')
    .replace(/,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/["”“]/g, '')
    .trim()

const fixBrands = (s) => {
  let out = s
  for (const [lo, hi] of BRANDS) out = out.replace(new RegExp(`\\b${lo}\\b`, 'gi'), hi)
  return out
}

const tidyTitle = (s) => {
  let t = fixBrands(stripNoise(s))
  if (!t) return ''
  t = t.charAt(0).toUpperCase() + t.slice(1)
  if (!t.endsWith('...')) t = t.replace(/\.+$/, '')
  return t.trim()
}

// The importer cut titles at 40 chars. If the title is a prefix of the caption's
// first line, rebuild it from the full line (capped at 70, never ending mid-phrase).
const completeTitle = (title, descFirstLine) => {
  const t = fold(title)
  const line = fold(descFirstLine)
  if (!line || !line.startsWith(t) || line.length <= t.length) return title
  let full = tidyTitle(descFirstLine)
  if (full.length > 70) {
    full = full.slice(0, 70)
    const lastSpace = full.lastIndexOf(' ')
    if (lastSpace > 30) full = full.slice(0, lastSpace)
    const words = full.split(' ')
    while (words.length > 1 && DANGLING.has(words[words.length - 1].toLowerCase())) words.pop()
    full = words.join(' ')
  }
  return full
}

const cleanDescription = (raw) => {
  const lines = (raw ?? '').split('\n')
  const kept = lines.filter((l) => {
    const bare = l
      .replace(EMOJI_RE, '')
      .replace(/\S*#\S+/g, '')
      .replace(/@[\w.]+/g, '')
      .replace(/[.\s♤♡◇♧·•\-–—*|]+/g, '')
    return bare.length > 0
  })
  let out = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  if (out.length > 600) {
    const cut = out.slice(0, 600)
    const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'))
    out = stop > 200 ? cut.slice(0, stop + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…'
  }
  return out
}

const fold = (s) => stripNoise(s ?? '').toLowerCase()

// ── run ────────────────────────────────────────────────────────────────────
const report = []
const dirs = fs.readdirSync(PHOTOS).filter((d) => fs.statSync(path.join(PHOTOS, d)).isDirectory())

// merge the duplicate pair's photo before its manifest disappears
for (const [id, m] of Object.entries(MERGE_INTO)) {
  const src = path.join(PHOTOS, id)
  const dst = path.join(PHOTOS, m.into)
  if (fs.existsSync(src) && fs.existsSync(dst)) {
    const files = fs.readdirSync(src).filter((f) => f.endsWith('.jpg') && f !== 'cover.jpg')
    files.forEach((f, i) => {
      const target = path.join(dst, `${String(fs.readdirSync(dst).filter((x) => /^\d+\.jpg$/.test(x)).length + 1 + i).padStart(2, '0')}.jpg`)
      if (!DRY) fs.renameSync(path.join(src, f), target)
      report.push(`merge  ${id}/${f} → ${m.into}/${path.basename(target)}`)
    })
  }
}

for (const id of dirs) {
  const file = path.join(PHOTOS, id, 'event.json')
  if (!fs.existsSync(file)) continue
  if (REMOVE.includes(id)) {
    if (!DRY) fs.rmSync(path.join(PHOTOS, id), { recursive: true })
    report.push(`remove ${id}`)
    continue
  }
  const ev = JSON.parse(fs.readFileSync(file, 'utf8'))
  const before = { title: ev.title, desc: (ev.description_it ?? '').length }
  const ov = overrides[id] ?? {}

  const rawDesc = ev.description_it ?? ''
  const desc = 'description_it' in ov ? ov.description_it : cleanDescription(rawDesc)

  let title = 'title' in ov ? ov.title : tidyTitle(ev.title)
  if (!('title' in ov)) {
    const firstLine = rawDesc.split('\n').find((l) => l.trim()) ?? ''
    title = completeTitle(title, firstLine)
  }

  const out = { ...ev, title, description_it: desc }

  // location from place-tags or caption text; subtitle (SOGGETTO) from tags
  if (!out.location) {
    const fromTag = (out.tags ?? []).map((t) => PLACES[t.toLowerCase()]).find(Boolean)
    const inDesc = Object.entries(PLACES).find(([lo]) => fold(rawDesc).includes(lo))?.[1]
    out.location = fromTag ?? inDesc ?? ''
  }
  if (!out.subtitle) out.subtitle = (out.tags ?? []).join(' · ')
  const norm = (s) => fold(s).replace(/\.+$/, '')
  if (norm(desc) && norm(desc) === norm(title)) out.description_it = ''

  const changed =
    out.title !== ev.title ||
    out.description_it !== ev.description_it ||
    out.location !== ev.location ||
    out.subtitle !== ev.subtitle ||
    out.featured !== ev.featured

  if (changed) {
    report.push(
      `event  ${id}\n  title: ${JSON.stringify(before.title)} → ${JSON.stringify(out.title)}\n` +
      `  desc : ${before.desc} → ${out.description_it.length} chars` +
      `${out.location !== ev.location ? `\n  loc  : ${JSON.stringify(ev.location)} → ${JSON.stringify(out.location)}` : ''}` +
      `${out.featured && !ev.featured ? '\n  ★ featured' : ''}`
    )
    if (!DRY) fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n')
  }
}

console.log((DRY ? 'DRY RUN\n' : '') + report.join('\n'))
if (!DRY) console.log(`\nDone. ${report.length} changes applied.`)
