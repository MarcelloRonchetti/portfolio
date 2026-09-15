// Remove Instagram VIDEO (reel) events from the portfolio.
// Reels are not photographs: the Graph API only gives us a poster frame, which
// doesn't match what the profile grid shows and inflates the photo counts.
// Also appends any unlisted NN.jpg files to their event's `photos` array so the
// displayed counts always match the real images on disk.
//
//   node scripts/prune-video-events.mjs --dry-run
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const PHOTOS = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../public/photos')
const DRY = process.argv.includes('--dry-run')

let removed = 0
let fixedPhotos = 0

for (const dir of fs.readdirSync(PHOTOS)) {
  const manifest = path.join(PHOTOS, dir, 'event.json')
  if (!fs.existsSync(manifest)) continue
  const j = JSON.parse(fs.readFileSync(manifest, 'utf8'))

  if (j.source?.media_type === 'VIDEO') {
    console.log('remove', dir, `(${j.title || 'untitled'}, ${j.date})`)
    if (!DRY) fs.rmSync(path.join(PHOTOS, dir), { recursive: true })
    removed++
    continue
  }

  const files = fs.readdirSync(path.join(PHOTOS, dir))
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && f !== 'cover.jpg')
    .sort()
  const photos = j.photos ?? []
  const missing = files.filter((f) => !photos.includes(f))
  if (missing.length > 0) {
    console.log('photos[] +=', missing.join(', '), '→', dir)
    if (!DRY) {
      j.photos = [...photos, ...missing].sort()
      fs.writeFileSync(manifest, JSON.stringify(j, null, 2) + '\n')
    }
    fixedPhotos++
  }
}

console.log(DRY ? '(dry-run) ' : '', `removed: ${removed}, manifests fixed: ${fixedPhotos}`)
