// Google Drive client (Drive API v3, read-only, API key — no OAuth).
//
// Archive layout (verified against the live folder — both are supported):
//   <categoria>/*.jpg + <categoria>/<raccolta>/*.jpg   → photo collections
//   <categoria>/*.mp4                                   → clips shown in Videos
//   video/*.mp4 (loose → 'Varie') and video/<categoria>/*.mp4
//   cv/ (folder) or a CV*.pdf / Curriculum*.pdf in root
//
// Media endpoints (re-verified 2026-10-27 after a Google behavior change):
//   - Images/posters: lh3.googleusercontent.com/d/<id>=<size> — CDN-resized,
//     stable, CORS *.
//   - Video streams: www.googleapis.com/drive/v3/files/<id>?alt=media&key=…
//     — 206 + content-range (seek), CORS echoes the origin, no CORP header.
//     The old drive.usercontent.google.com/download?…&confirm=t endpoint now
//     serves the "virus scan warning" HTML interstitial for files >100 MB as
//     soon as the request carries a Referer — i.e. from any real web page —
//     so it can no longer back a <video> element. It stays only for the CV
//     blob download (a PDF is never near 100 MB).
import { DRIVE_CONFIG, driveApiKey } from './driveConfig'
import { categories } from './events'
import { VIDEO_IG_ORDER } from './videoIgOrder'

export class DriveError extends Error {
  kind: 'not-configured' | 'not-found' | 'network'
  status?: number
  constructor(kind: DriveError['kind'], message: string, status?: number) {
    super(message)
    this.kind = kind
    this.status = status
    this.name = 'DriveError'
  }
}

export type DriveVideo = {
  /** Drive file id. */
  id: string
  /** File name cleaned for display (no extension, separators → spaces). */
  title: string
  /** Matched site category (case-insensitive) or 'Varie'. */
  category: string
  width?: number
  height?: number
  durationMs?: number
  sizeBytes?: string
  createdTime?: string
  /** Poster for cards (lh3 CDN, w800). */
  posterUrl: string
  /** Larger poster for the player (lh3 CDN, w1280). */
  posterLg: string
  /** Progressive stream URL (supports range requests). */
  streamUrl: string
  /** '720p' | '1080p' | '1440p' | '4K' | 'HD' (when metadata is missing). */
  qualityLabel: string
}

export type DrivePhoto = {
  id: string
  /** File name cleaned for display (no extension, separators → spaces). */
  name?: string
  fullUrl: string
  thumbUrl: string
}

// Thumb sizing: lh3 URLs are deterministic from the id, so pick a size per
// context — w400 for the 120px thumbstrip/rail, w800 for ~340px cards and
// posters, w1280 for the player poster, s0 (original) for the lightbox.

export type DrivePhotoCollection = {
  /** Story id used in routes: `drive-<folderId>`. */
  id: string
  folderName: string
  /** Folder name cleaned for display. */
  title: string
  category: string
  /** Thumbnail URL of the first image, for the gallery card. */
  cover: string
  date?: string
  photos: DrivePhoto[]
}

export type DriveCv = {
  fileId: string
  name: string
  mimeType?: string
  sizeBytes?: string
} | null

export type DriveContent = {
  videos: DriveVideo[] // sorted by createdTime desc, already quality-filtered
  photoCollections: DrivePhotoCollection[] // sorted by date desc
  cv: DriveCv
  fetchedAt: number
  /** Non-fatal notes (e.g. a subfolder failed to list). */
  errors: string[]
}

type DriveFile = {
  id: string
  name: string
  mimeType: string
  size?: string
  videoMediaMetadata?: { width?: number; height?: number; durationMillis?: string }
  thumbnailLink?: string
  createdTime?: string
  modifiedTime?: string
}

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const API = 'https://www.googleapis.com/drive/v3/files'

const isFolder = (f: DriveFile) => f.mimeType === FOLDER_MIME
// Google Docs/Sheets/… pseudo-files are not blobs (alt=media doesn't apply).
const isGoogleInternal = (f: DriveFile) =>
  f.mimeType.startsWith('application/vnd.google-apps.')

const errMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

function downloadUrl(fileId: string): string {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`
}

function streamUrl(fileId: string): string {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(driveApiKey())}`
}

function lhUrl(fileId: string, size: string): string {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=${size}`
}

async function apiList(folderId: string): Promise<DriveFile[]> {
  const key = driveApiKey()
  const out: DriveFile[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      pageSize: '200',
      fields:
        'nextPageToken,files(id,name,mimeType,size,videoMediaMetadata(width,height,durationMillis),createdTime,modifiedTime)',
      key,
    })
    if (pageToken) params.set('pageToken', pageToken)
    const res = await fetch(`${API}?${params}`)
    if (!res.ok) {
      let message = `HTTP ${res.status}`
      try {
        const body = await res.json()
        if (body?.error?.message) message = `${res.status} ${body.error.message}`
      } catch {
        /* keep the status-only message */
      }
      throw new DriveError('network', `Google Drive: ${message}`, res.status)
    }
    const data = (await res.json()) as { files?: DriveFile[]; nextPageToken?: string }
    out.push(...(data.files ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)
  return out
}

// Drive folder names map to site categories case-insensitively; anything else
// becomes its own category (e.g. 'Sport') — the gallery merges it in.
function categoryFor(folderName: string): string {
  const n = folderName.trim().toLowerCase()
  return categories.find((c) => c.toLowerCase() === n) ?? 'Varie'
}

// Subfolders of video/ name their own video tab (video/storytelling/ →
// 'Storytelling'); a name matching a local site category still maps to it.
function videoCategoryFor(folderName: string): string {
  const n = folderName.trim().toLowerCase()
  const local = categories.find((c) => c.toLowerCase() === n)
  if (local) return local
  const name = folderName.trim()
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Varie'
}

// Display title from a file name: separators → spaces, camelCase split
// ("AlfaRomeoGiulia" → "Alfa Romeo Giulia", "Mclaren720s" → "Mclaren 720S"),
// smart capitals that keep acronyms and model codes intact (BMW, GT2, GR86,
// 190E, T1…) and the editing-pipeline marker "final"/"final2…" dropped —
// unless dropping it would collapse the title onto another video's (walkRoot
// re-adds " Final" there so the grid never shows two identical cards).
// "porsche 911 carrera 3.0" keeps its decimal dot; "e36"/"v3" stay glued.
function cleanTitle(name: string, { keepFinal = false } = {}): string {
  let base = name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\./g, (_m, off, str) => (/\d/.test(str[off - 1] ?? '') && /\d/.test(str[off + 1] ?? '') ? '.' : ' '))
    .replace(/\s+/g, ' ')
    .trim()
  const pre = base
  if (!keepFinal) base = base.replace(/\s+final\d*$/i, '').trim()
  base = (base || pre)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-z]{2,})(\d)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
  return base.split(' ').map(w => {
    if (/^\d+[a-z]/i.test(w)) return w.replace(/^(\d+)([a-z])/i, (_m, d, l) => d + l.toUpperCase())
    if (/^\d/.test(w)) return w.toUpperCase()
    if (w === w.toUpperCase()) return w
    return w.charAt(0).toUpperCase() + w.slice(1)
  }).join(' ')
}

function toVideo(f: DriveFile, category: string, title: string): DriveVideo {
  const meta = f.videoMediaMetadata
  const w = meta?.width
  const h = meta?.height
  // Label by the short side so vertical 1080×1920 clips read as '1080p'.
  const short = w && h ? Math.min(w, h) : h
  return {
    id: f.id,
    title,
    category,
    width: w,
    height: h,
    durationMs: meta?.durationMillis ? parseInt(meta.durationMillis, 10) : undefined,
    sizeBytes: f.size,
    createdTime: f.createdTime,
    posterUrl: lhUrl(f.id, 'w800'),
    posterLg: lhUrl(f.id, 'w1280'),
    streamUrl: streamUrl(f.id),
    qualityLabel: short ? (short >= 2160 ? '4K' : short >= 1440 ? '1440p' : `${short}p`) : 'HD',
  }
}

const byCreatedDesc = (a: { createdTime?: string }, b: { createdTime?: string }) =>
  (b.createdTime ?? '').localeCompare(a.createdTime ?? '')

const byName = (a: DriveFile, b: DriveFile) =>
  a.name.localeCompare(b.name, undefined, { numeric: true })

const isImage = (f: DriveFile) =>
  !isFolder(f) && !isGoogleInternal(f) && f.mimeType.startsWith('image/')

async function walkRoot(): Promise<Omit<DriveContent, 'fetchedAt'>> {
  const errors: string[] = []
  const videos: DriveVideo[] = []
  const photoCollections: DrivePhotoCollection[] = []

  // Quality window: skip videos known to fall outside 720p–1080p (measured on
  // the short side so vertical HD clips pass). Files whose metadata is missing
  // (can happen right after upload) are kept rather than hidden.
  // Video files are collected first and turned into DriveVideo entries at the
  // end of the walk, so title dedup can see every title at once.
  const videoFiles: Array<{ f: DriveFile; category: string }> = []
  const pushVideos = (list: DriveFile[], category: string) => {
    for (const f of list) {
      if (isFolder(f) || !f.mimeType.startsWith('video/')) continue
      const w = f.videoMediaMetadata?.width
      const h = f.videoMediaMetadata?.height
      if (w && h) {
        const short = Math.min(w, h)
        if (short < DRIVE_CONFIG.minVideoHeight || short > DRIVE_CONFIG.maxVideoHeight) continue
      } else if (h && h < DRIVE_CONFIG.minVideoHeight) continue
      videoFiles.push({ f, category })
    }
  }

  const root = await apiList(DRIVE_CONFIG.rootFolderId)
  const dirs = root.filter(isFolder)
  const files = root.filter((f) => !isFolder(f))
  const nameOf = (d: DriveFile) => d.name.trim().toLowerCase()
  const videoDir = dirs.find((d) => nameOf(d) === DRIVE_CONFIG.videoDirName)
  const cvDir = dirs.find((d) => nameOf(d) === DRIVE_CONFIG.cvDirName)
  // foto/ is the optional explicit photo root; without it, every root folder
  // that isn't video/ or cv/ is a photo-category folder (the current layout).
  const fotoDir = dirs.find((d) => nameOf(d) === DRIVE_CONFIG.photoDirName)

  // ── Photo collections: <categoria>/*.jpg and <categoria>/<raccolta>/*.jpg ──
  const collectImages = (dir: DriveFile, category: string, list: DriveFile[]) => {
    const imgs = list.filter(isImage).sort(byName)
    if (imgs.length === 0) return
    photoCollections.push({
      id: `drive-${dir.id}`,
      folderName: dir.name,
      title: cleanTitle(dir.name),
      category,
      cover: lhUrl(imgs[0].id, 'w800'),
      date: dir.createdTime?.slice(0, 10),
      photos: imgs.map((f) => ({
        id: f.id,
        fullUrl: lhUrl(f.id, 's0'),
        thumbUrl: lhUrl(f.id, 'w400'),
      })),
    })
  }
  const photoCatDirs = fotoDir
    ? await apiList(fotoDir.id)
        .then((list) => list.filter(isFolder))
        .catch((e) => {
          errors.push(`Foto: ${errMessage(e)}`)
          return []
        })
    : dirs.filter((d) => nameOf(d) !== DRIVE_CONFIG.videoDirName && nameOf(d) !== DRIVE_CONFIG.cvDirName)
  // The three branches are independent — run them concurrently: a cold walk
  // costs ~8 API round-trips and halving the wall time is free (the quota
  // impact is negligible against thousands of units/minute).

  // CV: pdf inside cv/ wins, else a CV*/Curriculum* file in root.
  const pickCv = (list: DriveFile[]): DriveCv => {
    const usable = list.filter((f) => !isFolder(f) && !isGoogleInternal(f))
    const pdfs = usable.filter((f) => f.mimeType === 'application/pdf')
    const pool = pdfs.length > 0 ? pdfs : usable
    const named = pool.filter((f) => DRIVE_CONFIG.cvFilePattern.test(f.name))
    const best = named[0] ?? pool[0]
    return best
      ? { fileId: best.id, name: best.name, mimeType: best.mimeType, sizeBytes: best.size }
      : null
  }
  let cv: DriveCv = null

  const walkPhotoCats = async () => {
    for (const catDir of photoCatDirs) {
      const cat = categoryFor(catDir.name)
      const children = await apiList(catDir.id).catch((e) => {
        errors.push(`Foto/${catDir.name}: ${errMessage(e)}`)
        return []
      })
      pushVideos(children, cat) // category folders may hold clips too (Business/ does)
      collectImages(catDir, cat, children)
      for (const collDir of children.filter(isFolder)) {
        const list = await apiList(collDir.id).catch((e) => {
          errors.push(`Foto/${catDir.name}/${collDir.name}: ${errMessage(e)}`)
          return []
        })
        pushVideos(list, cat)
        collectImages(collDir, cat, list)
      }
    }
  }

  const walkVideos = async () => {
    if (!videoDir) return
    const children = await apiList(videoDir.id).catch((e) => {
      errors.push(`Video: ${errMessage(e)}`)
      return []
    })
    pushVideos(
      children.filter((f) => !isFolder(f)),
      'Varie'
    )
    await Promise.all(
      children.filter(isFolder).map(async (dir) => {
        const vids = await apiList(dir.id).catch((e) => {
          errors.push(`Video/${dir.name}: ${errMessage(e)}`)
          return []
        })
        pushVideos(vids, videoCategoryFor(dir.name))
      })
    )
  }

  const walkCv = async () => {
    if (!cvDir) return
    const children = await apiList(cvDir.id).catch((e) => {
      errors.push(`CV: ${errMessage(e)}`)
      return []
    })
    cv = pickCv(children)
  }

  await Promise.all([walkPhotoCats(), walkVideos(), walkCv()])
  photoCollections.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  // Loose clips at the root (e.g. "Copia di final-vac_final.mp4") → 'Varie'.
  pushVideos(files, 'Varie')

  // Title dedup: "ferrari.mp4" and "ferrari_final.mp4" would both strip to
  // "Ferrari" — the one carrying the editing marker keeps " Final" so the
  // grid never shows two identical cards.
  const titleCounts = new Map<string, number>()
  for (const { f } of videoFiles) {
    const t = cleanTitle(f.name).toLowerCase()
    titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1)
  }
  for (const { f, category } of videoFiles) {
    const stripped = cleanTitle(f.name)
    const duplicated = (titleCounts.get(stripped.toLowerCase()) ?? 0) > 1
    videos.push(toVideo(f, category, duplicated ? cleanTitle(f.name, { keepFinal: true }) : stripped))
  }
  // Display order: the Instagram reels sequence (see videoIgOrder.ts). Videos
  // missing from the list follow at the end, newest first.
  const igRank = new Map(VIDEO_IG_ORDER.map((title, i) => [title, i]))
  videos.sort((a, b) => {
    const ra = igRank.get(a.title)
    const rb = igRank.get(b.title)
    if (ra !== undefined && rb !== undefined) return ra - rb
    if (ra === undefined && rb === undefined) return byCreatedDesc(a, b)
    return ra === undefined ? 1 : -1
  })

  if (!cv) cv = pickCv(files.filter((f) => DRIVE_CONFIG.cvFilePattern.test(f.name)))

  return { videos, photoCollections, cv, errors }
}

// ── Cache + single-flight ─────────────────────────────────────────────────────

type CacheShape = { content: DriveContent; fetchedAt: number }

// Staleness is epoch-based, not a fixed TTL: content fetched before the last
// 06:00 local crossing is stale, so the archive refreshes itself once a day
// on the first visit after that hour (user requirement: update daily at 6).
function cacheEpoch(now = Date.now()): number {
  const probe = new Date(now)
  probe.setHours(DRIVE_CONFIG.cacheResetHour, 0, 0, 0)
  const base = now < probe.getTime() ? now - 86_400_000 : now
  const d = new Date(base)
  d.setHours(DRIVE_CONFIG.cacheResetHour, 0, 0, 0)
  return d.getTime()
}

// Media hosts the app itself builds URLs from; anything else in a cached entry
// means the cache was tampered with (the github.io origin is shared across
// projects) or written by an older schema — drop it wholesale. Dropping
// drive.usercontent.google.com from this list is what invalidates caches
// written before the 2026-10-27 stream fix (their stream URLs are dead).
const URL_HOSTS = ['https://lh3.googleusercontent.com/', 'https://www.googleapis.com/drive/v3/files/']
const isMediaUrl = (u: unknown): u is string =>
  typeof u === 'string' && URL_HOSTS.some((h) => u.startsWith(h))
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0

function validVideo(v: unknown): v is DriveVideo {
  const x = v as DriveVideo
  return (
    isStr(x?.id) &&
    isStr(x?.title) &&
    isStr(x?.category) &&
    isMediaUrl(x?.posterUrl) &&
    isMediaUrl(x?.posterLg) &&
    isMediaUrl(x?.streamUrl)
  )
}

function validCollection(c: unknown): c is DrivePhotoCollection {
  const x = c as DrivePhotoCollection
  return (
    isStr(x?.id) &&
    isStr(x?.folderName) &&
    isStr(x?.title) &&
    isStr(x?.category) &&
    isMediaUrl(x?.cover) &&
    Array.isArray(x?.photos) &&
    // Empty collections are never produced by the walk — an empty array in the
    // cache means tampering, and would crash the story view downstream.
    x.photos.length > 0 &&
    x.photos.every((p) => {
      const ph = p as DrivePhoto
      return isStr(ph?.id) && isMediaUrl(ph?.fullUrl) && isMediaUrl(ph?.thumbUrl)
    })
  )
}

function readCache(): CacheShape | null {
  try {
    const raw = localStorage.getItem(DRIVE_CONFIG.cacheKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheShape
    const content = parsed?.content
    if (
      typeof parsed?.fetchedAt !== 'number' ||
      !Array.isArray(content?.videos) ||
      !Array.isArray(content?.photoCollections) ||
      !content.videos.every(validVideo) ||
      !content.photoCollections.every(validCollection)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeCache(content: DriveContent): void {
  try {
    localStorage.setItem(
      DRIVE_CONFIG.cacheKey,
      JSON.stringify({ content, fetchedAt: content.fetchedAt })
    )
  } catch {
    /* quota exceeded: run without cache */
  }
}

export function clearDriveCache(): void {
  try {
    localStorage.removeItem(DRIVE_CONFIG.cacheKey)
  } catch {
    /* ignore */
  }
}

/** Synchronous read of a still-fresh cache, for first-paint hydration. */
export function peekDriveCache(): DriveContent | null {
  const cached = readCache()
  if (!cached || cached.fetchedAt < cacheEpoch()) return null
  return cached.content
}

let inFlight: Promise<DriveContent> | null = null

export async function loadDriveContent(opts?: { force?: boolean }): Promise<DriveContent> {
  if (!driveApiKey()) {
    throw new DriveError(
      'not-configured',
      'Google Drive non è configurato: manca la API key (VITE_DRIVE_API_KEY).'
    )
  }
  if (!opts?.force) {
    const cached = readCache()
    if (cached && cached.fetchedAt >= cacheEpoch()) {
      return cached.content
    }
  }
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const partial = await walkRoot()
      const content: DriveContent = { ...partial, fetchedAt: Date.now() }
      writeCache(content)
      return content
    } catch (e) {
      if (e instanceof DriveError && e.status === 404) {
        throw new DriveError(
          'not-found',
          'Cartella Drive non trovata o non condivisa pubblicamente.'
        )
      }
      throw e
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

/** Photos of ONE Drive folder, for the client delivery rooms (Room.tsx).
 *  Unlike the archive walk this lists any folder the API key can see, so a
 *  "Consegne/<cliente>" folder placed OUTSIDE the public archive root stays
 *  off the site's gallery/sitemap while remaining deliverable to its client.
 *  thumb is card-size (w800): room tiles are bigger than a thumbstrip. */
export async function listRoomPhotos(folderId: string): Promise<DrivePhoto[]> {
  const files = await apiList(folderId)
  return files
    .filter(isImage)
    .sort(byName)
    .map((f) => ({
      id: f.id,
      name: cleanTitle(f.name),
      fullUrl: lhUrl(f.id, 's0'),
      thumbUrl: lhUrl(f.id, 'w800'),
    }))
}

/** Pulls the CV as a Blob for an in-place download (never a redirect to Drive). */
export async function fetchCvBlob(): Promise<{ blob: Blob; filename: string }> {
  const content = await loadDriveContent()
  if (!content.cv) {
    throw new DriveError('not-found', "CV non trovato nell'archivio Drive.")
  }
  const res = await fetch(downloadUrl(content.cv.fileId))
  if (!res.ok) {
    throw new DriveError('network', `Google Drive: HTTP ${res.status} durante il download del CV.`)
  }
  const blob = await res.blob()
  let filename = content.cv.name
  if (content.cv.mimeType === 'application/pdf' && !/\.pdf$/i.test(filename)) filename += '.pdf'
  return { blob, filename }
}
