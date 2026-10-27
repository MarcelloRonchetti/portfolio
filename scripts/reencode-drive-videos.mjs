#!/usr/bin/env node
// Ri-encoding dei video dell'archivio Drive in H.264 (compatibile con tutti
// i browser). I video caricati finora sono H.265/HEVC: l'audio parte ovunque
// ma l'immagine resta nera sui browser senza decodifica hardware HEVC
// (Chrome/Firefox su Linux non ce l'hanno affatto).
//
// Scarica ogni video dal folder pubblico, verifica il codec con ffprobe,
// converte gli HEVC in H.264 (CRF 21, AAC 192k, +faststart per lo streaming
// web) e scrive il risultato in `drive-reencoded/` rispecchiando la struttura
// delle cartelle Drive — pronta da trascinare di nuovo su Drive.
//
// Uso (dalla root della repo):
//   node scripts/reencode-drive-videos.mjs                # tutti i video
//   node scripts/reencode-drive-videos.mjs --only ferrari # filtro sul nome
//   node scripts/reencode-drive-videos.mjs --dry-run      # solo elenco
//
// Richiede: ffmpeg/ffprobe nel PATH, VITE_DRIVE_API_KEY in app/.env.local o
// nell'ambiente. I file già H.264 vengono saltati. Idempotente: l'output
// esistente non viene riscritto (usa --force per rigenerare).

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const ROOT = '1RGYyVwU8rexBPCXN3Iil2ih5xXBIbrS3'
const API = 'https://www.googleapis.com/drive/v3'
const REFERER = 'https://marcelloronchetti.github.io/portfolio/'
const OUT_DIR = join(fileURLToPath(new URL('..', import.meta.url)), 'drive-reencoded')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const onlyIdx = args.indexOf('--only')
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null

function apiKey() {
  if (process.env.VITE_DRIVE_API_KEY) return process.env.VITE_DRIVE_API_KEY
  try {
    const env = readFileSync(join(fileURLToPath(new URL('../app', import.meta.url)), '.env.local'), 'utf8')
    const m = env.match(/^VITE_DRIVE_API_KEY=(.+)$/m)
    if (m) return m[1].trim()
  } catch {
    /* handled below */
  }
  console.error('API key mancante: imposta VITE_DRIVE_API_KEY nell’ambiente o in app/.env.local')
  process.exit(1)
}

const KEY = apiKey()

async function apiList(folderId) {
  const out = []
  let pageToken
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      pageSize: '200',
      fields: 'nextPageToken,files(id,name,mimeType,size,videoMediaMetadata(width,height))',
      key: KEY,
    })
    if (pageToken) params.set('pageToken', pageToken)
    const res = await fetch(`${API}/files?${params}`, { headers: { Referer: REFERER } })
    if (!res.ok) throw new Error(`Drive API HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = await res.json()
    out.push(...(data.files ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)
  return out
}

const isFolder = (f) => f.mimeType === 'application/vnd.google-apps.folder'

// Stesse regole di app/src/lib/drive.ts: video/ (sciolti + sottocartelle),
// cartelle-categoria in root (possono contenere clip), file video sciolti in root.
async function collectVideos() {
  const videos = []
  const root = await apiList(ROOT)
  const dirs = root.filter(isFolder)
  const videoDir = dirs.find((d) => d.name.trim().toLowerCase() === 'video')
  const skip = new Set(['video', 'cv'])

  const add = (f, relDir) => {
    if (!f.mimeType?.startsWith('video/')) return
    videos.push({ id: f.id, name: f.name, size: Number(f.size ?? 0), relDir })
  }
  if (videoDir) {
    for (const f of await apiList(videoDir.id)) {
      if (isFolder(f)) {
        for (const g of await apiList(f.id)) add(g, `video/${f.name}`)
      } else {
        add(f, 'video')
      }
    }
  }
  for (const d of dirs) {
    if (skip.has(d.name.trim().toLowerCase())) continue
    for (const f of await apiList(d.id)) {
      add(f, d.name)
      if (isFolder(f)) {
        for (const g of await apiList(f.id)) add(g, `${d.name}/${f.name}`)
      }
    }
  }
  for (const f of root.filter((x) => !isFolder(x))) add(f, '.')
  return videos
}

async function videoCodec(file) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'quiet', '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', file,
    ])
    return stdout.trim() || null
  } catch {
    return null
  }
}

async function download(id, dest) {
  const res = await fetch(`${API}/files/${id}?alt=media&key=${KEY}`, {
    headers: { Referer: REFERER },
  })
  if (!res.ok) throw new Error(`download HTTP ${res.status}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}

async function transcode(src, dest) {
  await execFileAsync('ffmpeg', [
    '-y', '-i', src,
    '-c:v', 'libx264', '-crf', '21', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    dest,
  ])
}

const mb = (n) => `${(n / 1e6).toFixed(1)} MB`

const all = await collectVideos()
const list = only ? all.filter((v) => v.name.toLowerCase().includes(only.toLowerCase())) : all
console.log(`Trovati ${all.length} video${only ? `, filtro "${only}" → ${list.length}` : ''}.\n`)

let done = 0
let skippedCodec = 0
let skippedExisting = 0
let failed = 0

for (const [i, v] of list.entries()) {
  const label = `${v.relDir === '.' ? '' : v.relDir + '/'}${v.name}`
  const prefix = `[${i + 1}/${list.length}]`
  if (dryRun) {
    console.log(`${prefix} ${label} (${mb(v.size)})`)
    continue
  }
  const outPath = join(OUT_DIR, v.relDir, v.name)
  if (!force && existsSync(outPath)) {
    console.log(`${prefix} ${label} — già convertito, salto`)
    skippedExisting++
    continue
  }
  const tmp = join(OUT_DIR, '.tmp-' + v.name.replace(/[^\w.-]+/g, '_'))
  try {
    mkdirSync(dirname(outPath), { recursive: true })
    process.stdout.write(`${prefix} ${label} — scarico… `)
    await download(v.id, tmp)
    const size = statSync(tmp).size
    const codec = await videoCodec(tmp)
    if (codec === 'h264') {
      rmSync(tmp)
      console.log(`già H.264 (${mb(size)}), salto`)
      skippedCodec++
      continue
    }
    process.stdout.write(`${codec ?? 'sconosciuto'} → H.264… `)
    await transcode(tmp, outPath)
    rmSync(tmp)
    const outSize = statSync(outPath).size
    console.log(`ok (${mb(size)} → ${mb(outSize)})`)
    done++
  } catch (e) {
    console.log(`ERRORE: ${e.message}`)
    failed++
    try { rmSync(tmp) } catch { /* ignore */ }
  }
  await new Promise((r) => setTimeout(r, 1500))
}

console.log(
  `\nFatto: ${done} convertiti, ${skippedCodec} già H.264, ${skippedExisting} già presenti` +
    (failed ? `, ${failed} errori` : '') + '.'
)
if (!dryRun && done + skippedCodec + skippedExisting > 0) {
  console.log(`\nOutput in ${OUT_DIR}`)
  console.log('Ricarica i file su Drive nelle stesse cartelle (sovrascrivendo gli HEVC):')
  console.log('il sito li aggiornerà da solo al primo accesso dopo le 06:00.')
}
