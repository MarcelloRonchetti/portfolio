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
  source?: { provider?: string; media_id?: string; media_type?: string }
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

// The landing hero is always the latest Instagram post (reels are never
// imported as events, but guard against VIDEO anyway); manual folders and the
// legacy `featured` flag never take the hero. Falls back to the newest event
// only when no Instagram post exists at all.
export const featuredEvent: Event | undefined =
  events.find(
    (e) => e.source?.provider === 'instagram' && e.source?.media_type !== 'VIDEO'
  ) ?? events[0]

// ─── raccolte della galleria: solo marche ───
// Brief dell'utente: le card sono le MARCHE delle auto — gli hashtag generici
// (cars, carsdaily, supercars, reportage, huracán…) creavano cartelle
// duplicate con la stessa copertina. Ogni evento entra nella marca del suo
// tag / titolo / id cartella; chi non appartiene a nessuna marca non produce
// card (resta su sitemap e storie). L'ordine segue la data dell'evento più
// recente: la marca dell'ultimo post guida la galleria.
const BRAND_PATTERNS: Array<[RegExp, string]> = [
  [/ferrari|sf90|\bf8\b|\b488\b|\b296\b/, 'Ferrari'],
  [/lamborghini|lamborghinisto|hurac[aá]n|sterrato|revuelto|temerario|\burus\b/, 'Lamborghini'],
  [/porsche|\b911\b|carrera|gt3|boxster|cayman/, 'Porsche'],
  [/maserati/, 'Maserati'],
  [/\blotus\b|emira|elise|exige/, 'Lotus'],
  [/\bbmw\b/, 'BMW'],
  [/mercedes|\bamg\b/, 'Mercedes-AMG'],
  [/mc ?laren|maclaren|artura/, 'McLaren'],
  [/pagani|utopia/, 'Pagani'],
  [/corvette|chevrolet/, 'Corvette'],
  [/alfa ?romeo|\balfa\b/, 'Alfa Romeo'],
  [/ducati/, 'Ducati'],
  [/honda|civic/, 'Honda'],
  [/lancia|delta integrale/, 'Lancia'],
  [/dallara/, 'Dallara'],
  [/\baudi\b/, 'Audi'],
  [/toyota|\bgr86\b/, 'Toyota'],
  [/\balpine\b/, 'Alpine'],
  [/cadillac/, 'Cadillac'],
  [/nissan|\bgtr\b|gt-r/, 'Nissan'],
  [/\bford\b|mustang|gt40/, 'Ford'],
  [/bizzarrini/, 'Bizzarrini'],
  [/matra|simca/, 'Matra-Simca'],
  [/aston ?martin|\bdb ?11\b/, 'Aston Martin'],
]

function brandOf(ev: Event): string | undefined {
  const hay = `${ev.id} ${ev.tags.join(' ')} ${ev.title}`.toLowerCase()
  for (const [pattern, brand] of BRAND_PATTERNS) {
    if (pattern.test(hay)) return brand
  }
  return undefined
}

export const collections: Collection[] = (() => {
  const byBrand = new Map<string, Event[]>()
  for (const ev of events) {
    const brand = brandOf(ev)
    if (!brand) continue
    const list = byBrand.get(brand) ?? []
    list.push(ev)
    byBrand.set(brand, list)
  }
  const out: Collection[] = []
  for (const [brand, list] of byBrand) {
    // events è già newest-first: il rappresentante è l'evento più recente.
    out.push({
      tag: brand,
      n: list.reduce((acc, e) => acc + Math.max(1, e.photos.length), 0),
      desc: [...new Set(list.map((e) => e.year))].sort().join(' · '),
      representativeId: list[0].id,
      links: list[0].links,
      category: list[0].category,
    })
  }
  // La marca dell'ultimo post sta in cima; poi quantità di foto, poi nome.
  const newestDate = new Map(out.map((c) => [c.tag, events.find((e) => e.id === c.representativeId)?.date ?? '']))
  out.sort(
    (a, b) =>
      (newestDate.get(b.tag) ?? '').localeCompare(newestDate.get(a.tag) ?? '') ||
      b.n - a.n ||
      a.tag.localeCompare(b.tag)
  )
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

// Browsing pool for a story: the collection tag when the visitor arrived from
// a collection card, else the gallery category — never jumping across
// categories by date.
function poolFor(opts?: { tag?: string; category?: string }): Event[] {
  return opts?.tag
    ? eventsByTag(opts.tag)
    : opts?.category
      ? events.filter((e) => e.category === opts.category)
      : events
}

// Newest-first list for the story page's related rail. The pool is the
// collection tag when the visitor arrived from a collection card, falling back
// to the gallery category — never all-events: letting tagless arrivals hit the
// full archive surfaced Landscape/People posts under Motorsport stories.
// Returns [] only when the category pool itself has no other events (a
// single-event category deep-linked): the caller hides the rail rather than
// widening scope.
export function relatedEvents(
  id: string,
  opts?: { tag?: string; category?: string },
  limit = 12
): Event[] {
  const fromTag = opts?.tag
    ? poolFor({ tag: opts.tag }).filter((e) => e.id !== id)
    : []
  if (fromTag.length > 0) return fromTag.slice(0, limit)
  return poolFor({ category: opts?.category })
    .filter((e) => e.id !== id)
    .slice(0, limit)
}
