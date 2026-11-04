// Rimozione dei doppioni dall'archivio locale: dal 2026-09 il sync ha
// re-importato post già presenti come cartelle legacy (slug dal titolo) —
// le coppie si riconoscono dallo stesso permalink Instagram. Per ogni coppia:
//   - resta la cartella LEGACY (titoli curati "Soggetto — Luogo, anno",
//     permalink già nel manifest → il sync non la ricreerà);
//   - le foto presenti solo nel gemello instagram-* vengono portate nella
//     cartella che resta (alcuni carousel legacy avevano foto in meno);
//   - il gemello instagram-* viene rimosso.
// Vengono rimossi anche i 3 eventi locali (Business/Landscape/People) che
// duplicano 1:1 le raccolte fotografiche dell'archivio Drive (stessi file).
// Idempotente. Run: node scripts/dedupe-imported-events.mjs [--dry-run]
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const PHOTOS = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../public/photos')
const DRY = process.argv.includes('--dry-run')

let removed = 0
let ported = 0
let keysPatched = 0

const manifests = []
for (const name of fs.readdirSync(PHOTOS).sort()) {
  const dir = path.join(PHOTOS, name)
  const manifestPath = path.join(dir, 'event.json')
  if (!fs.statSync(dir).isDirectory() || !fs.existsSync(manifestPath)) continue
  manifests.push({ name, dir, manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')) })
}

// ── coppie per permalink ──
const byUrl = new Map()
for (const e of manifests) {
  const url = (e.manifest.links?.instagram_url ?? '').replace(/\/$/, '')
  if (url) {
    if (!byUrl.has(url)) byUrl.set(url, [])
    byUrl.get(url).push(e)
  }
}

// Allinea il keeper al gemello: i due importatori assegnano gli stessi nomi
// (cover.jpg, NN.jpg) ma il manifest legacy può elencare meno foto di quante
// ne abbia sul disco (file orfani) e raramente manca un file. I BYTE restano
// quelli del keeper (le cover legacy sono state sostituite a mano dal fix
// collage; l'ordine interno dei due importatori non è confrontabile).
const portPhotos = (keeper, doomed) => {
  const names = [...new Set([
    doomed.manifest.cover ?? 'cover.jpg',
    ...(doomed.manifest.photos ?? []),
  ])]
  const listed = new Set([keeper.manifest.cover ?? 'cover.jpg', ...(keeper.manifest.photos ?? [])])
  for (const file of names) {
    const src = path.join(doomed.dir, file)
    const dst = path.join(keeper.dir, file)
    const onDisk = fs.existsSync(dst)
    if (!onDisk && fs.existsSync(src)) {
      if (!DRY) fs.copyFileSync(src, dst)
      ported++
    }
    if (!listed.has(file) && fs.existsSync(dst)) {
      keeper.manifest.photos = [...(keeper.manifest.photos ?? []), file].sort()
      ported++
    }
  }
}

const removeFolder = (e) => {
  if (!DRY) fs.rmSync(e.dir, { recursive: true, force: true })
  removed++
  console.log(`${DRY ? '[dry-run] ' : ''}rimosso doppione: ${e.name}`)
}

for (const [url, group] of byUrl) {
  if (group.length < 2) continue
  // Keeper: la cartella legacy (non instagram-<mediaId>) se c'è; altrimenti
  // quella con più foto. I gemelli con solo permalink sono già curati.
  const legacy = group.find((e) => !/^instagram-\d+$/.test(e.name))
  const keeper = legacy ?? group.slice().sort((a, b) => (b.manifest.photos?.length ?? 0) - (a.manifest.photos?.length ?? 0))[0]
  for (const twin of group) {
    if (twin === keeper) continue
    if (keeper === legacy) portPhotos(keeper, twin)
    else portPhotos(twin, keeper) // keeper instagram-*: porta le foto della legacy
    // il keeper deve portare la chiave di dedup, altrimenti il sync ricrea
    // il gemello alla prossima run
    if (!(keeper.manifest.links?.instagram_url)) {
      keeper.manifest.links = { ...(keeper.manifest.links ?? {}), instagram_url: url }
      keysPatched++
    }
    if (!(keeper.manifest.source?.media_id)) {
      const other = group.find((e) => e !== keeper && e.manifest.source?.media_id)
      if (other) {
        keeper.manifest.source = { ...(keeper.manifest.source ?? {}), media_id: other.manifest.source.media_id }
        keysPatched++
      }
    }
    if (!DRY) {
      fs.writeFileSync(path.join(keeper.dir, 'event.json'), JSON.stringify(keeper.manifest, null, 2) + '\n')
    }
    removeFolder(twin)
  }
}

// ── eventi locali che duplicano 1:1 l'archivio Drive ──
// Business/Landscape/People 2026-09-15: stessi file delle raccolte
// fotografiche Drive (contura_workoutfactory-*, IMG_*), che restano la
// fonte viva gestita dall'utente.
for (const e of manifests) {
  const cat = e.manifest.category ?? 'Motorsport'
  if (cat === 'Motorsport') continue
  if (!['Business', 'Landscape', 'People'].includes(cat)) continue
  if (!fs.existsSync(e.dir)) continue // già rimosso come gemello
  if (!(e.manifest.links?.instagram_url ?? '')) {
    removeFolder(e)
  }
}

console.log(`\nfine: ${removed} cartelle rimosse, ${ported} foto portate, ${keysPatched} chiavi di dedup aggiunte${DRY ? ' (dry-run)' : ''}`)
