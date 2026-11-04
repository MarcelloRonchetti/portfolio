// Ripara gli eventi la cui cover è usata solo come thumbnail: per gli eventi
// Instagram il primo asset del post diventa cover.jpg e NON era incluso in
// `photos`, quindi la prima foto spariva dallo story. Aggiunge cover.jpg in
// testa a `photos` — ma solo se non è già elencata e se non è una copia
// byte-identica di una foto già presente (le cover sostituite dai collage).
// Idempotente. Run: node scripts/merge-cover-into-photos.mjs [--dry-run]
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import url from 'node:url'

const PHOTOS = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../public/photos')
const DRY = process.argv.includes('--dry-run')

const md5 = (file) => crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex')

let fixed = 0
let skipped = 0

for (const name of fs.readdirSync(PHOTOS).sort()) {
  const dir = path.join(PHOTOS, name)
  const manifestPath = path.join(dir, 'event.json')
  if (!fs.statSync(dir).isDirectory() || !fs.existsSync(manifestPath)) continue
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const photos = manifest.photos ?? []
  const cover = manifest.cover ?? 'cover.jpg'
  const coverPath = path.join(dir, cover)

  if (photos.includes(cover) || !fs.existsSync(coverPath)) {
    skipped++
    continue
  }
  const coverHash = md5(coverPath)
  const alreadyShown = photos.some((p) => {
    const pPath = path.join(dir, p)
    return fs.existsSync(pPath) && md5(pPath) === coverHash
  })
  if (alreadyShown) {
    skipped++
    continue
  }

  manifest.photos = [cover, ...photos]
  if (!DRY) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  fixed++
  console.log(`${DRY ? '[dry-run] ' : ''}cover aggiunta a ${name} (${photos.length} → ${photos.length + 1} foto)`)
}

console.log(`\nfine: ${fixed} eventi corretti, ${skipped} già a posto${DRY ? ' (dry-run)' : ''}`)
