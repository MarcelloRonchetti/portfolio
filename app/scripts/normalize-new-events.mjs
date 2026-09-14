// Normalizza gli eventi appena importati dall'importer ufficiale (folder instagram-*):
// - titoli: via emoji/hashtag/@mention, case dei marchi, prima lettera maiuscola
// - descrizioni: via treni di puntini, blocchi di hashtag, mention; '' se ripete il titolo
// - tags: mappati sulla tassonomia delle raccolte del sito (una sola per evento)
// - subtitle: dal tag; location: da tag/luogo noto nel testo
// Non tocca gli eventi preesistenti. Idempotente. --dry-run supportato.
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const PHOTOS = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../public/photos')
const DRY = process.argv.includes('--dry-run')

const EMOJI = '[\\p{Extended_Pictographic}\\u{1F1E6}-\\u{1F1FF}\\u{FE0F}\\u{200D}\\u{20E3}]'

// Sostituzioni idempotenti: i lookahead evitano di re-expandere "Mercedes-AMG".
const BRAND_PATTERNS = [
  [/mercedes(?![-\s]?amg)/gi, 'Mercedes-AMG'],
  [/(?<!mercedes-)\bamg\b/gi, 'Mercedes-AMG'],
  [/maclaren/gi, 'McLaren'],
  [/\bmclaren\b/gi, 'McLaren'],
  [/\blamborghini\b/gi, 'Lamborghini'],
  [/\bferrari\b/gi, 'Ferrari'],
  [/\bporsche\b/gi, 'Porsche'],
  [/\bmaserati\b/gi, 'Maserati'],
  [/\bpagani\b/gi, 'Pagani'],
  [/\bducati\b/gi, 'Ducati'],
  [/\bcorvette\b/gi, 'Corvette'],
  [/\bhonda\b/gi, 'Honda'],
  [/\blotus\b/gi, 'Lotus'],
  [/\bbmw\b/gi, 'BMW'],
  [/\balfa romeo\b/gi, 'Alfa Romeo'],
  [/\bimola\b/gi, 'Imola'],
  [/\bmodena\b/gi, 'Modena'],
  [/\bmugello\b/gi, 'Mugello'],
]

// Tassonomia delle raccolte del sito (match su hashtag/titolo, case-insensitive).
const TAXONOMY = [
  ['ferrari', 'Ferrari'], ['lamborghini', 'Lamborghini'], ['porsche', 'Porsche'],
  ['mclaren', 'McLaren'], ['maclaren', 'McLaren'], ['bmw', 'BMW'], ['lotus', 'Lotus'],
  ['maserati', 'Maserati'], ['pagani', 'Pagani'], ['corvette', 'Corvette'],
  ['mercedes', 'Mercedes-AMG'], ['amg', 'Mercedes-AMG'], ['alfa', 'Alfa Romeo'],
  ['honda', 'Honda'], ['duciali', 'Ducati'], ['ducati', 'Ducati'],
  ['dallara', 'Dallara'], ['imola', 'Imola'], ['modena', 'Modena'], ['mugello', 'Mugello'],
  ['formula', 'Formula'], ['wrc', 'WRC'], ['motogp', 'MotoGP'], ['rally', 'WRC'],
  ['reportage', 'Reportage'], ['supercar', 'Supercar'], ['carspotter', 'Supercar'],
]

const stripNoise = (s) =>
  s
    .replace(new RegExp(EMOJI, 'gu'), '')
    .replace(/(?:^|\s)\S*#\S+/g, ' ')
    .replace(/(?:^|\s)@[\w.]+/g, ' ')
    .replace(/,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()

const fixBrands = (s) => {
  let out = s
  for (const [re, hi] of BRAND_PATTERNS) out = out.replace(re, hi)
  return out
}

const tidyTitle = (s) => {
  let t = fixBrands(stripNoise(s))
  if (!t) return ''
  t = t.charAt(0).toUpperCase() + t.slice(1)
  if (!t.endsWith('...')) t = t.replace(/\.+$/, '')
  return t.trim()
}

const fold = (s) => stripNoise(s ?? '').toLowerCase()

const pickTag = (ev) => {
  const haystack = fold([...(ev.tags ?? []), ev.title, ev.description_it].join(' '))
  for (const [needle, tag] of TAXONOMY) {
    if (haystack.includes(needle)) return tag
  }
  return 'Reportage'
}

const PLACES = { imola: 'Imola', modena: 'Modena', mugello: 'Mugello' }

let changed = 0
for (const dir of fs.readdirSync(PHOTOS)) {
  if (!dir.startsWith('instagram-')) continue
  const file = path.join(PHOTOS, dir, 'event.json')
  if (!fs.existsSync(file)) continue
  const ev = JSON.parse(fs.readFileSync(file, 'utf8'))
  const out = { ...ev }

  const rawDesc = ev.description_it ?? ''
  const title = tidyTitle(ev.title) || tidyTitle(ev.tags?.[0] ?? '') || 'Instagram'

  // descrizione: righe vuote/hashtag/mention fuori; '' se ripete il titolo
  const lines = rawDesc.split('\n').filter((l) => {
    const bare = l.replace(new RegExp(EMOJI, 'gu'), '').replace(/\S*#\S+/g, '').replace(/@[\w.]+/g, '').replace(/[.\s·•\-–—*|]+/g, '')
    return bare.length > 0
  })
  let desc = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  const norm = (s) => fold(s).replace(/\.+$/, '')
  if (norm(desc) === norm(title)) desc = ''
  if (desc.length > 600) desc = desc.slice(0, 600).slice(0, Math.max(desc.slice(0, 600).lastIndexOf('. '), 200)) + '…'

  const tag = pickTag(ev)
  out.title = title
  out.description_it = desc
  out.tags = [tag]
  if (!out.subtitle) out.subtitle = tag
  if (!out.location) {
    out.location =
      Object.entries(PLACES).find(([lo]) => fold(ev.tags?.join(' ') + ' ' + rawDesc).includes(lo))?.[1] ?? ''
  }
  out.year = out.date?.slice(0, 4) ?? out.year

  if (JSON.stringify(out) !== JSON.stringify(ev)) {
    changed++
    console.log(`${dir}\n  title: ${JSON.stringify(ev.title)} → ${JSON.stringify(out.title)}\n  tag: ${JSON.stringify(ev.tags)} → ${JSON.stringify(out.tags)}`)
    if (!DRY) fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n')
  }
}
console.log((DRY ? 'DRY RUN — ' : '') + `${changed} eventi normalizzati`)
