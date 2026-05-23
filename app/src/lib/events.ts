// Auto-loader for photo events.
// Each event lives in `app/public/photos/<id>/` with an `event.json` manifest
// (imported via glob at build time) and image files served raw by Vite.

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export type Hue = 'oxblood' | 'brass' | 'leather'

export type RawEvent = {
  id: string
  tag: string
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

export type Event = Required<Pick<RawEvent, 'id' | 'tag' | 'title' | 'year' | 'date'>> &
  RawEvent & {
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
  if (!raw.title || !raw.year || !raw.tag || !raw.date) {
    console.warn(`[events] skipping ${folderId}: missing title/year/tag/date`)
    return null
  }
  return {
    ...raw,
    id: folderId,
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

// Auto-assign Roman numerals per unique tag (in date-desc order).
{
  const seen = new Map<string, string>()
  let idx = 0
  for (const ev of allEvents) {
    if (!seen.has(ev.tag)) {
      seen.set(ev.tag, ROMAN[idx] ?? String(idx + 1))
      idx++
    }
    if (!ev.no) ev.no = seen.get(ev.tag)!
  }
}

export const events: Event[] = allEvents

export const featuredEvent: Event | undefined =
  events.find((e) => e.featured) ?? events[0]

export const collections: Collection[] = (() => {
  const byTag = new Map<string, Event[]>()
  for (const ev of events) {
    const list = byTag.get(ev.tag) ?? []
    list.push(ev)
    byTag.set(ev.tag, list)
  }
  const out: Collection[] = []
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
      no: representative.no,
      representativeId: representative.id,
      links: representative.links,
    })
  }
  return out
})()

export function eventById(id: string): Event | undefined {
  return events.find((e) => e.id === id)
}

export function eventsByTag(tag: string): Event[] {
  return events.filter((e) => e.tag === tag)
}

export function firstEventByTag(tag: string): Event | undefined {
  return events.find((e) => e.tag === tag)
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
