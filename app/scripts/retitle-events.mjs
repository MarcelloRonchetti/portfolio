// Re-titles every imported event with a sober Italian formula:
//   [Soggetto] — [Luogo/evento], [anno]
// and replaces the English Instagram captions with short Italian descriptions
// (or none). Idempotent. Run: node scripts/retitle-events.mjs [--dry-run]
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const PHOTOS = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../public/photos')
const DRY = process.argv.includes('--dry-run')

const TITLES = {
  '50-ferrari-wec-2024-2025-ferrari': 'Ferrari #50 — WEC, 2025',
  'a-green-demon-on-the-track-2026-mercedes-amg': 'Mercedes-AMG — In pista, 2026',
  'another-day-on-the-track-2025-ferrari': 'Ferrari — In pista, 2025',
  'another-ferrari-it-s-like-there-was-a-2025-ferrari': 'Raduno Ferrari, 2025',
  'back-from-the-holidays-2026-supercar': 'Supercar — In gara, 2026',
  'best-porsche-design-hands-down-2026-porsche': 'Porsche — Imola, 2026',
  'blue-lamborghini-shining-like-the-2025-lamborghini': 'Lamborghini blu, 2025',
  'don-t-comment-that-one-gif-2026-mercedes-amg': 'Mercedes-AMG GT3, 2026',
  'ducati-x-lamborghini-2025-lamborghini': 'Ducati e Lamborghini, 2025',
  'ferrari-invasion-in-imola-2026-ferrari': 'Ferrari — Imola, 2026',
  'four-beasts-under-the-sunset-glow-2025-reportage': 'Moto al tramonto, 2025',
  'gold-digger-lamborghini-on-the-move-2026-lamborghini': 'Lamborghini — Imola, 2026',
  'golden-hour-2025-ferrari': "Ferrari all'ora dorata, 2025",
  'green-bean-2026-lotus': 'Lotus verde, 2026',
  'in-another-life-2025-corvette': 'Corvette, 2025',
  'i-think-i-ve-seen-you-somewhere-2025-ferrari': 'Ferrari, 2025',
  'kickstarting-autumn-with-awesome-group-2025-bmw': 'Raduno auto e moto, 2025',
  'la-ferrari-296-challenge-ferita-di-2026-ferrari': 'Ferrari 296 Challenge — Spirit of Racing, 2026',
  'lamborghini-full-black-opaque-at-2026-lamborghini': 'Lamborghini — Cars Passion, 2026',
  'lamborghini-murcielago-class-2001-but-2025-lamborghini': 'Lamborghini Murciélago, 2025',
  'like-a-star-2025-ferrari': 'Ferrari, 2025',
  'look-who-s-here-2025-porsche': 'Porsche, 2025',
  'lotus-2026-lotus': 'Lotus, 2026',
  'lotus-emira-2025-lotus': 'Lotus Emira, 2025',
  'lotus-s2-2026-lotus': 'Lotus S2, 2026',
  'maserati-fuoriserie-2025-maserati': 'Maserati Fuoriserie, 2025',
  'maserati-gt-folgore-2025-maserati': 'Maserati GT Folgore, 2025',
  'mountains-2025-reportage': 'Montagne, 2025',
  'n-8-are-t-mac-racing-parkertracing-2026-bmw': 'BMW — Imola, 2026',
  'pagani-utopia-makes-an-appearance-in-2025-pagani': 'Pagani Utopia — Modena, 2025',
  'photograpy-2025-reportage': 'Reportage, 2025',
  'porsche-cup-2026-2026-porsche': 'Porsche Cup — Imola, 2026',
  'some-formula-2000-flying-on-track-2026-supercar': 'Formula 2000 — In pista, 2026',
  'some-othe-cool-and-shiny-cars-in-the-2025-supercar': 'Auto in notturna — Modena, 2025',
  'stitch-in-a-cool-car-with-his-bmw-2025-bmw': 'BMW, 2025',
  'the-biggest-tragedy-in-life-is-that-2025-reportage': 'Reportage, 2025',
  'the-chicken-was-still-warm-2025-porsche': 'Porsche 911 Carrera S, 2025',
  'the-color-of-the-sunset-2025-reportage': 'Tramonto, 2025',
  'the-golden-boys-in-the-510-cv-992-2026-porsche': 'Porsche 992 GT3 — 510 CV, 2026',
  'the-lamborghini-countach-is-a-legendary-2025-lamborghini': 'Lamborghini Countach, 2025',
  'the-mclaren-artura-trophy-evo-of-2026-mclaren': 'McLaren Artura Trophy Evo — Target Racing, 2026',
  'the-new-lamborghini-temerario-with-2025-lamborghini': 'Lamborghini Temerario, 2025',
  'these-are-some-cute-cars-2025-supercar': 'Supercar, 2025',
  'these-eyes-2025-ferrari': 'Dallara — Dettaglio, 2025',
  'this-honda-kinda-looks-2025-honda': 'Honda Civic, 2025',
  'top-down-engine-loud-zero-problems-2025-ferrari': 'Ferrari a cielo aperto, 2025',
  'travel-2025-reportage': 'Viaggi, 2025',
  'unedited-2025-reportage': 'Reportage, 2025',
  'vsracing-lamborghini-dominates-in-imola-2026-lamborghini': 'Lamborghini VSRacing — Imola, 2026',
  'we-are-so-back-2025-ferrari': 'Ferrari — Imola, 2025',
  'we-re-so-back-with-a-maclaren-2025-mclaren': 'McLaren, 2025',
  'who-doesn-t-love-the-rain-2025-supercar': 'Supercar sotto la pioggia, 2025',
  'will-this-end-racism-2025-ferrari': 'Ferrari — Imola, 2025',
  'yellow-lamborghini-revuelto-2026-lamborghini': 'Lamborghini Revuelto, 2026',
  'you-remind-me-of-someone-2025-ferrari': 'Ferrari, 2025',
  'zanasi-racing-ferrari-296-challenge-in-2026-ferrari': 'Ferrari 296 Challenge — Zanasi Racing, Imola 2026',
}

// Descriptions: empty unless there is real, faithful content to say in Italian.
const DESCRIPTIONS = {
  'back-from-the-holidays-2026-supercar': "Alcuni scatti dall'ultima gara.",
  'four-beasts-under-the-sunset-glow-2025-reportage': 'Quattro moto sotto la luce del tramonto.',
  'kickstarting-autumn-with-awesome-group-2025-bmw': "Scatti di gruppo dal raduno auto e moto d'autunno.",
  'lamborghini-murcielago-class-2001-but-2025-lamborghini':
    'Lamborghini Murciélago del 2001, prodotta dal 2002 al 2010. Motore V12 da oltre 500 CV.',
  'n-8-are-t-mac-racing-parkertracing-2026-bmw':
    'Le vetture in gara: la N 8, la N 23 e la N 55 con i rispettivi team.',
  'the-lamborghini-countach-is-a-legendary-2025-lamborghini':
    'La Lamborghini Countach è una supercar italiana prodotta dal 1974 al 1990, celebre per il design futuristico firmato Marcello Gandini.',
  'the-new-lamborghini-temerario-with-2025-lamborghini': 'La nuova Lamborghini Temerario, con quasi 1000 CV.',
}

// Taxonomy fix: a monoposto non è una "Supercar".
const RETAG = {
  'some-formula-2000-flying-on-track-2026-supercar': ['Formula'],
}

let changed = 0
for (const id of fs.readdirSync(PHOTOS)) {
  const file = path.join(PHOTOS, id, 'event.json')
  if (!fs.existsSync(file)) continue
  const ev = JSON.parse(fs.readFileSync(file, 'utf8'))
  const out = { ...ev }

  if (TITLES[id]) out.title = TITLES[id]
  out.description_it = DESCRIPTIONS[id] ?? ''
  if (RETAG[id]) out.tags = RETAG[id]

  if (JSON.stringify(out) !== JSON.stringify(ev)) {
    changed++
    console.log(`${id}\n  title: ${JSON.stringify(ev.title)} → ${JSON.stringify(out.title)}`)
    if (!DRY) fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n')
  }
}
console.log((DRY ? 'DRY RUN — ' : '') + `${changed} manifests updated`)
