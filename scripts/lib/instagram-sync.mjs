// Pure helpers for the Instagram importer (no I/O here — see sync-instagram.mjs).
// Follows docs/superpowers/plans/2026-09-08-photo-portfolio-instagram-implementation.md.

import { existsSync } from 'node:fs'

const FIELDS = 'id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,children{id,media_type,media_url,thumbnail_url}'

const stripHashtags = (line) => line.replace(/#[\p{L}\p{N}_-]+/gu, '').replace(/\s+/g, ' ').trim()

export function captionToEvent({ id, caption = '', permalink = '', timestamp = '' }) {
  const lines = caption
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(stripHashtags)
    .filter(Boolean)
  const title = lines.find((line) => !line.startsWith('#'))?.slice(0, 90) || 'Instagram'
  const description_it = lines.filter((line) => line !== title).join('\n')
  const seen = new Map()
  for (const match of caption.matchAll(/#([\p{L}\p{N}_-]+)/gu)) {
    const key = match[1].toLocaleLowerCase()
    // Map.set sostituirebbe il valore: serve il case del PRIMO hashtag.
    if (!seen.has(key)) seen.set(key, match[1].replace(/_/g, ' '))
  }
  const tags = [...seen.values()]
  return {
    id: `instagram-${id}`,
    title,
    description_it,
    tags: tags.length ? tags : ['Instagram'],
    date: timestamp.slice(0, 10),
  }
}

export function expandMedia(media) {
  if (media.media_type === 'CAROUSEL_ALBUM' && media.children?.data) {
    return media.children.data
      .filter((child) => child.media_type === 'IMAGE' && child.media_url)
      .map((child) => ({ kind: 'image', url: child.media_url }))
  }
  if (media.media_type === 'IMAGE' && media.media_url) {
    return [{ kind: 'image', url: media.media_url }]
  }
  if (media.media_type === 'VIDEO' && media.thumbnail_url) {
    return [{ kind: 'thumbnail', url: media.thumbnail_url }]
  }
  return []
}

export function isImportedEvent(path) {
  // Caller passes the manifest path; existence is the whole question.
  return existsSync(path)
}

// Build the write-plan for one media record. `existingKeys` holds media ids AND
// permalinks of already-imported events (legacy imports only carry permalinks).
export function planEvent(media, existingKeys = new Set()) {
  if (existingKeys.has(media.id) || existingKeys.has(media.permalink)) {
    return { action: 'skip' }
  }
  const assets = expandMedia(media)
  if (assets.length === 0) {
    return { action: 'unsupported', media_type: media.media_type }
  }
  const draft = captionToEvent(media)
  const photos = assets.slice(1).map((_, i) => `${String(i + 1).padStart(2, '0')}.jpg`)
  const manifest = {
    id: draft.id,
    tags: draft.tags.slice(0, 3),
    title: draft.title,
    year: draft.date.slice(0, 4),
    subtitle: '',
    location: '',
    date: draft.date,
    description_it: draft.description_it,
    cover: 'cover.jpg',
    photos,
    links: { instagram_url: media.permalink ?? '' },
    featured: false,
    source: { provider: 'instagram', media_id: media.id, media_type: media.media_type },
  }
  return { action: 'create', folder: draft.id, manifest, assets }
}

// ── network + filesystem side of the import ────────────────────────────────

async function resolveAccountId(token, fetchImpl) {
  if (process.env.IG_ACCOUNT_ID) return process.env.IG_ACCOUNT_ID
  const res = await fetchImpl(
    `https://graph.facebook.com/v23.0/me/accounts?fields=instagram_business_account{id}&access_token=${token}`
  )
  const body = await res.json()
  const id = body.data?.[0]?.instagram_business_account?.id
  if (!id) throw new Error('Cannot resolve Instagram account id from token')
  return id
}

export async function fetchAllMedia({ token, fetchImpl = fetch }) {
  const accountId = await resolveAccountId(token, fetchImpl)
  const media = []
  let url =
    `https://graph.facebook.com/v23.0/${accountId}/media?fields=${FIELDS}&limit=100&access_token=${token}`
  while (url) {
    const res = await fetchImpl(url)
    const body = await res.json()
    if (body.error) throw new Error(`Instagram API error: ${body.error.message}`)
    media.push(...(body.data ?? []))
    url = body.paging?.next
  }
  return media
}

export async function runImport({ token, dryRun = false, fetchImpl = fetch, photosRoot }) {
  if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN is required')
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const root = photosRoot ?? path.resolve('app/public/photos')

  // existing keys: folder names, media ids, permalinks of every present event
  const existingKeys = new Set()
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    existingKeys.add(entry.name.replace(/^instagram-/, ''))
    try {
      const manifest = JSON.parse(
        await fs.readFile(path.join(root, entry.name, 'event.json'), 'utf8')
      )
      if (manifest.source?.media_id) existingKeys.add(manifest.source.media_id)
      if (manifest.links?.instagram_url) existingKeys.add(manifest.links.instagram_url)
    } catch {
      /* unreadable manifest — treat folder name as the only key */
    }
  }

  const media = await fetchAllMedia({ token, fetchImpl })
  const report = { created: 0, skipped: 0, unsupported: 0, errors: 0 }

  for (const record of media) {
    const plan = planEvent(record, existingKeys)
    if (plan.action === 'skip') { report.skipped++; continue }
    if (plan.action === 'unsupported') { report.unsupported++; continue }
    if (dryRun) { report.created++; continue }

    // atomic write: temp folder, then rename after every asset succeeds
    const finalDir = path.join(root, plan.folder)
    const tmpDir = path.join(root, `.tmp-${plan.folder}-${Date.now()}`)
    try {
      await fs.mkdir(tmpDir, { recursive: true })
      const names = ['cover.jpg', ...plan.manifest.photos]
      for (let i = 0; i < plan.assets.length; i++) {
        const res = await fetchImpl(plan.assets[i].url)
        if (!res.ok) throw new Error(`download ${names[i]}: HTTP ${res.status}`)
        const bytes = Buffer.from(await res.arrayBuffer())
        await fs.writeFile(path.join(tmpDir, names[i]), bytes)
      }
      await fs.writeFile(
        path.join(tmpDir, 'event.json'),
        JSON.stringify(plan.manifest, null, 2) + '\n'
      )
      await fs.rename(tmpDir, finalDir)
      existingKeys.add(record.id)
      existingKeys.add(record.permalink)
      report.created++
    } catch (err) {
      report.errors++
      await fs.rm(tmpDir, { recursive: true, force: true })
      console.error(`errore su ${plan.folder}: ${err.message}`)
    }
  }
  return report
}
