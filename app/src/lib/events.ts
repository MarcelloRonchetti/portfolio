// Auto-loader for photo events.
// Each event lives in `app/public/photos/<id>/` with an `event.json` manifest
// (imported via glob at build time) and image files served raw by Vite.

const ROMAN = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
]

export type Hue = 'oxblood' | 'brass' | 'leather'

export type RawEvent = {
  id: string
  // New schema: tags is an array. Legacy: tag is a single string (still supported).
  tags?: string[]
  tag?: string
  title: string
  year: string
  subtitle?: string
  location?: string
  date: string
  hue?: Hue
  no?: string
  description_it?: string
  description_en?: string
  specs?: string
  gear?: { body?: string; lens?: string }
  cover?: string
  photos?: string[]
  links?: {
    instagram_url?: string
    gallery_url?: string
    external_url?: string
  }
  featured?: boolean
  base_url?: string
}

export type Event = Omit<RawEvent, 'tag' | 'tags'> & {
  id: string
  tags: string[]          // always present, derived from `tags ?? [tag]`
  tag: string             // primary tag = tags[0] (back-compat)
  title: string
  year: string
  date: string
  cover: string
  photos: string[]
  hue: Hue
  no: string
}

export type Collection = {
  tag: string
  n: number
  desc: string
  hue: Hue
  no: string
  representativeId: string
  links?: RawEvent['links']
}

const manifests = import.meta.glob<{ default: RawEvent }>(
  '../../public/photos/*/event.json',
  { eager: true }
)

function folderIdFromPath(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 2] ?? ''
}

function normalize(raw: RawEvent, folderId: string): Event | null {
  if (raw.id && raw.id !== folderId) {
    console.warn(
      `[events] manifest id "${raw.id}" doesn't match folder "${folderId}". Using folder name.`
    )
  }
  const tags = (raw.tags && raw.tags.length > 0)
    ? raw.tags
    : (raw.tag ? [raw.tag] : [])

  if (!raw.title || !raw.year || tags.length === 0 || !raw.date) {
    console.warn(`[events] skipping ${folderId}: missing title/year/tags/date`)
    return null
  }
  return {
    ...raw,
    id: folderId,
    tags,
    tag: tags[0],
    cover: raw.cover ?? 'cover.jpg',
    photos: raw.photos ?? [],
    hue: raw.hue ?? 'brass',
    no: raw.no ?? '',
  }
}

const allEvents: Event[] = Object.entries(manifests)
  .map(([path, mod]) => normalize(mod.default, folderIdFromPath(path)))
  .filter((e): e is Event => e !== null)
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

// Auto-assign Roman numerals per unique tag (in date-desc order, by FIRST appearance).
{
  const seen = new Map<string, string>()
  let idx = 0
  for (const ev of allEvents) {
    for (const tag of ev.tags) {
      if (!seen.has(tag)) {
        seen.set(tag, ROMAN[idx] ?? String(idx + 1))
        idx++
      }
    }
    if (!ev.no) ev.no = seen.get(ev.tags[0])!
  }
}

export const events: Event[] = allEvents

export const featuredEvent: Event | undefined =
  events.find((e) => e.featured) ?? events[0]

export const collections: Collection[] = (() => {
  const byTag = new Map<string, Event[]>()
  for (const ev of events) {
    for (const tag of ev.tags) {
      const list = byTag.get(tag) ?? []
      list.push(ev)
      byTag.set(tag, list)
    }
  }
  const out: Collection[] = []
  // Track Roman numerals so they match the global assignment.
  const numerals = new Map<string, string>()
  let idx = 0
  for (const ev of events) {
    for (const tag of ev.tags) {
      if (!numerals.has(tag)) {
        numerals.set(tag, ROMAN[idx] ?? String(idx + 1))
        idx++
      }
    }
  }
  for (const [tag, list] of byTag) {
    const representative = list[0]
    const totalShots = list.reduce(
      (acc, e) => acc + (e.photos?.length ?? 0) + (e.cover ? 1 : 0),
      0
    )
    const descParts = list
      .map((e) => e.location?.split(',')[0]?.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 3)
    out.push({
      tag,
      n: totalShots,
      desc: descParts.join(' · ') || representative.subtitle?.toLowerCase() || '',
      hue: representative.hue,
      no: numerals.get(tag) ?? '?',
      representativeId: representative.id,
      links: representative.links,
    })
  }
  // Sort collections by number of events desc, then alphabetically
  out.sort((a, b) => (b.n - a.n) || a.tag.localeCompare(b.tag))
  return out
})()

export function eventById(id: string): Event | undefined {
  return events.find((e) => e.id === id)
}

export function eventsByTag(tag: string): Event[] {
  return events.filter((e) => e.tags.includes(tag))
}

export function firstEventByTag(tag: string): Event | undefined {
  return events.find((e) => e.tags.includes(tag))
}

export function photoUrl(event: Event, file: string): string {
  if (event.base_url) {
    return event.base_url.replace(/\/$/, '') + '/' + file
  }
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  return `${base}/photos/${event.id}/${file}`
}

export function adjacentEvents(id: string): { prev?: Event; next?: Event } {
  const i = events.findIndex((e) => e.id === id)
  if (i === -1) return {}
  return {
    prev: i > 0 ? events[i - 1] : undefined,
    next: i < events.length - 1 ? events[i + 1] : undefined,
  }
}
