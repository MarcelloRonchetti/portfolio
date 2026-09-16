// Auto-loader for photo events.
// Each event lives in `app/public/photos/<id>/` with an `event.json` manifest
// (imported via glob at build time) and image files served raw by Vite.

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
  description_it?: string
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
  category?: string
}

export type Event = Omit<RawEvent, 'tag' | 'tags' | 'category'> & {
  id: string
  tags: string[]          // always present, derived from `tags ?? [tag]`
  tag: string             // primary tag = tags[0] (back-compat)
  title: string
  year: string
  date: string
  cover: string
  photos: string[]
  category: string
}

export type Collection = {
  tag: string
  n: number
  desc: string
  representativeId: string
  links?: RawEvent['links']
  category: string
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
    category: raw.category || 'Motorsport',
  }
}

const allEvents: Event[] = Object.entries(manifests)
  .map(([path, mod]) => normalize(mod.default, folderIdFromPath(path)))
  .filter((e): e is Event => e !== null)
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

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
  for (const [tag, list] of byTag) {
    const representative = list[0]
    out.push({
      tag,
      n: list.reduce((acc, e) => acc + Math.max(1, e.photos.length), 0),
      desc: [...new Set(list.map((e) => e.year))].sort().join(' · '),
      representativeId: representative.id,
      links: representative.links,
      category: representative.category,
    })
  }
  // Sort collections by number of events desc, then alphabetically
  out.sort((a, b) => (b.n - a.n) || a.tag.localeCompare(b.tag))
  return out
})()

// Gallery pages: Motorsport first (the site's core), the rest alphabetical.
// Derived from the manifests, so a new category folder shows up on its own.
export const categories: string[] = (() => {
  const set = new Set(events.map((e) => e.category))
  const rest = [...set]
    .filter((c) => c !== 'Motorsport')
    .sort((a, b) => a.localeCompare(b))
  return set.has('Motorsport') ? ['Motorsport', ...rest] : rest
})()

export function categoryFromSlug(slug: string): string | undefined {
  return categories.find((c) => c.toLowerCase() === slug.toLowerCase())
}

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

// Prev/next stay inside what the visitor is browsing: the collection tag when
// they arrived from a collection card, else the gallery category — never
// jumping across categories by date. Wraps at the ends so even a small
// collection never dead-ends.
export function adjacentEvents(
  id: string,
  opts?: { tag?: string; category?: string }
): { prev?: Event; next?: Event } {
  const pool = opts?.tag
    ? eventsByTag(opts.tag)
    : opts?.category
      ? events.filter((e) => e.category === opts.category)
      : events
  const i = pool.findIndex((e) => e.id === id)
  if (i === -1 || pool.length < 2) return {}
  return {
    prev: pool[(i - 1 + pool.length) % pool.length],
    next: pool[(i + 1) % pool.length],
  }
}
