// Client delivery rooms — private galleries where a client reviews a delivered
// selection (approve / request changes / comment / favourites), GammaGrit-style.
//
// The site is static (GitHub Pages): there is no server, so a room is a
// privacy-grade courtesy, NOT authentication. The password is verified against
// a SHA-256 hash stored in this file, decisions live in the client's
// localStorage and leave the device only through the summary the client copies
// or emails back. No secrets, no accounts, no backend — and nothing here must
// ever pretend otherwise (see SECURITY-NOTES.md in the repo root).
//
// Adding a room for a real client:
//   1. pick the photos, either:
//        eventId: an existing event (app/public/photos/<id>/) — photos already
//                 public on the site, fine for post-publication deliveries;
//        driveFolderId: a Drive folder OUTSIDE the public archive root (e.g.
//                 Consegne/<cliente>/) — delivers work the site has not
//                 published (see SECURITY-NOTES.md for the guarantees);
//      plus driveVideoCategory for the Films tab, if any
//   2. choose a password and hash it (salt fresh and random per room):
//      node -e "const c=require('crypto');const s=SALT;console.log(c.createHash('sha256').update(s+':'+process.argv[1]).digest('hex'))" PASSWORD
//   3. for a real client put the entry in VITE_ROOMS_EXTRA (Actions secret /
//      .env.local), NOT in this tracked file — see SECURITY-NOTES.md
// The room becomes reachable at /portfolio/room/<id> and is deliberately NOT
// in the sitemap, llms.txt or any nav — it travels to the client by link.

import { DATA } from './data'
import { eventById, photoUrl, type Event } from './events'

export type PhotoDecision = 'approved' | 'changes'

export type RoomActivityEntry = {
  /** epoch ms */
  at: number
  label: string
}

export type RoomState = {
  decisions: Record<string, PhotoDecision>
  comments: Record<string, string>
  favorites: Record<string, boolean>
  activity: RoomActivityEntry[]
}

export type Room = {
  /** URL segment: ^[\w-]+$ — also the storage key suffix. */
  id: string
  title: string
  client: string
  note?: string
  /** Local event id: its photos are the delivered selection (already-public work). */
  eventId?: string
  /** Drive folder id whose images are the selection. Use a folder OUTSIDE the
   *  public archive root to deliver work the site has not published yet — the
   *  gallery walk only lists the archive root, this lists exactly one folder. */
  driveFolderId?: string
  /** Subset of photo files to deliver (event rooms only); empty = the whole event. */
  photoFiles?: string[]
  /** Drive archive category whose videos populate the Films tab. */
  driveVideoCategory?: string
  /** SHA-256 hex of salt:password; absent = the room opens without a gate. */
  passwordHash?: string
  /** Salt for passwordHash. Real client rooms: a fresh random salt each time. */
  passwordSalt?: string
  /** Last usable day, YYYY-MM-DD (local end of day). */
  expires?: string
  /** Show a "download the original" action in the proofing lightbox. */
  downloads?: boolean
  /** Overlay the photographer's name on every photo. */
  watermark?: boolean
}

export const ROOM_ID_RE = /^[\w-]{1,64}$/

// Demo room (photos already public on the site). Password della demo:
// benvenuto2026 — sostituire per un cliente reale con una password ad alta
// entropia e un salt nuovo (ricetta qui sotto). Le stanze dei clienti reali
// NON devono finire in questo file: usano VITE_ROOMS_EXTRA (see below).
export const ROOMS: Room[] = [
  {
    id: 'moto-al-tramonto',
    title: 'Moto al tramonto',
    client: 'Cliente demo',
    note:
      'Questa è la selezione consegnata. Sfoglia e lascia il tuo giudizio foto per foto: ' +
      'approva le immagini definitive o segnala quelle da rivedere con un commento. ' +
      'Il riepilogo resta su questo dispositivo finché non lo invii.',
    eventId: 'four-beasts-under-the-sunset-glow-2025-reportage',
    driveVideoCategory: 'Business',
    // node -e "const c=require('crypto');const s='r7Qx2mLp9sT4vB8n';console.log(c.createHash('sha256').update(s+':'+process.argv[1]).digest('hex'))" PASSWORD
    passwordSalt: 'r7Qx2mLp9sT4vB8n',
    passwordHash: 'dd01aac1d080cc9d903c1328f83f35d3686c743ddf397c1b3ad6e1c39494fd26',
    expires: '2026-12-31',
    downloads: false,
    watermark: true,
  },
]

// Client rooms kept OUT of the public repo: a gitignored .env.local (dev) or a
// GitHub Actions secret (prod — exported to the build in deploy.yml) can inject
// VITE_ROOMS_EXTRA as a JSON array of Room objects. Malformed entries are
// dropped with a warning, never fatal.
function roomsFromEnv(): Room[] {
  try {
    const raw = import.meta.env.VITE_ROOMS_EXTRA
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid = parsed.filter((r): r is Room => {
      const x = r as Room | null
      // Guard prima di ogni dereferenziazione: un `null` nell'array non deve
      // buttare via tutte le stanze (il catch esterno mentirebbe sul perché).
      if (!x || typeof x !== 'object') {
        console.warn('[rooms] scartata una stanza non valida in VITE_ROOMS_EXTRA')
        return false
      }
      const hasSource =
        (typeof x.eventId === 'string' ? 1 : 0) + (typeof x.driveFolderId === 'string' ? 1 : 0)
      const ok =
        ROOM_ID_RE.test(x.id ?? '') &&
        typeof x.title === 'string' &&
        typeof x.client === 'string' &&
        hasSource === 1 &&
        (x.passwordHash === undefined || typeof x.passwordHash === 'string') &&
        (x.passwordSalt === undefined || typeof x.passwordSalt === 'string')
      if (!ok) console.warn('[rooms] scartata una stanza non valida in VITE_ROOMS_EXTRA')
      return ok
    })
    const trackedIds = new Set(ROOMS.map((r) => r.id))
    for (const r of valid) {
      if (!r.passwordHash) console.warn(`[rooms] la stanza "${r.id}" è aperta: nessun gate.`)
      if (trackedIds.has(r.id)) {
        console.warn(
          `[rooms] id "${r.id}" duplicato: vince la stanza tracciata, quella da VITE_ROOMS_EXTRA è irraggiungibile.`
        )
      }
      trackedIds.add(r.id)
    }
    return valid
  } catch {
    console.warn('[rooms] VITE_ROOMS_EXTRA non è JSON valido: ignorato.')
    return []
  }
}

export function roomById(id: string): Room | undefined {
  if (!ROOM_ID_RE.test(id)) return undefined
  const all = [...ROOMS, ...roomsFromEnv()]
  return all.find((r) => r.id === id)
}

export function roomExpired(room: Room, now = Date.now()): boolean {
  if (!room.expires) return false
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(room.expires)
  if (!m) return false
  return now > new Date(`${room.expires}T23:59:59`).getTime()
}

// ── password gate ─────────────────────────────────────────────────────────────

export async function sha256Hex(text: string): Promise<string | null> {
  try {
    if (!crypto?.subtle) return null
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

// Constant-time-ish compare so a wrong guess can't be measured by response
// timing; the gate is a courtesy anyway, this is just good hygiene.
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyRoomPassword(room: Room, input: string): Promise<boolean> {
  if (!room.passwordHash) return true
  const hash = await sha256Hex(`${room.passwordSalt ?? ''}:${input}`)
  return hash !== null && timingSafeEqualHex(hash, room.passwordHash)
}

const gateKey = (roomId: string) => `mr.room.gate.${roomId}`

export function isRoomUnlocked(room: Room): boolean {
  if (!room.passwordHash) return true
  try {
    return sessionStorage.getItem(gateKey(room.id)) === '1'
  } catch {
    return false
  }
}

export function markRoomUnlocked(room: Room): void {
  try {
    sessionStorage.setItem(gateKey(room.id), '1')
  } catch {
    /* ignore */
  }
}

// ── proofing state (per device, per room) ────────────────────────────────────

const stateKey = (roomId: string) => `mr.room.v1.${roomId}`

const emptyState = (): RoomState => ({ decisions: {}, comments: {}, favorites: {}, activity: [] })

// localStorage is user-writable (and shared across github.io projects): every
// value is type-checked on load so tampered or stale entries degrade to empty
// instead of crashing the render.
function stringMap(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string') out[k] = val
  }
  return out
}

function decisionMap(v: unknown): Record<string, PhotoDecision> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, PhotoDecision> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (val === 'approved' || val === 'changes') out[k] = val
  }
  return out
}

function boolMap(v: unknown): Record<string, boolean> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, boolean> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'boolean') out[k] = val
  }
  return out
}

export function loadRoomState(roomId: string): RoomState {
  try {
    const raw = localStorage.getItem(stateKey(roomId))
    if (!raw) return emptyState()
    const p = JSON.parse(raw) as Partial<RoomState>
    return {
      decisions: decisionMap(p.decisions),
      comments: stringMap(p.comments),
      favorites: boolMap(p.favorites),
      activity: Array.isArray(p.activity)
        ? p.activity
            .filter((a) => a && typeof a.at === 'number' && typeof a.label === 'string')
            .slice(0, 12)
        : [],
    }
  } catch {
    return emptyState()
  }
}

export function saveRoomState(roomId: string, state: RoomState): void {
  try {
    localStorage.setItem(stateKey(roomId), JSON.stringify(state))
  } catch {
    /* quota exceeded: proofing keeps working in memory */
  }
}

export function pushActivity(state: RoomState, label: string): RoomState {
  return {
    ...state,
    activity: [{ at: Date.now(), label }, ...state.activity].slice(0, 12),
  }
}

// ── room content ──────────────────────────────────────────────────────────────

export function roomEvent(room: Room): Event | undefined {
  return room.eventId ? eventById(room.eventId) : undefined
}

export function roomPhotos(room: Room): string[] {
  const ev = roomEvent(room)
  if (!ev) return []
  const all = ev.photos.length > 0 ? ev.photos : [ev.cover]
  if (!room.photoFiles || room.photoFiles.length === 0) return all
  const wanted = new Set(room.photoFiles)
  return all.filter((f) => wanted.has(f))
}

export function roomPhotoUrl(room: Room, file: string): string {
  const ev = roomEvent(room)
  if (!ev) return ''
  return photoUrl(ev, file)
}

// ── feedback summary (the only channel back to the photographer) ─────────────

// maxComment: mail clients truncate long mailto: URLs (often around 2 KB) —
// the email variant shortens comments and caps the FOTO list, the clipboard
// copy keeps everything whole.
export function buildFeedbackSummary(
  room: Room,
  state: RoomState,
  files: Array<{ key: string; label: string }>,
  opts?: { maxComment?: number; maxPhotos?: number }
): string {
  const maxComment = opts?.maxComment
  const clip = (c: string) =>
    maxComment && c.length > maxComment ? c.slice(0, maxComment - 1) + '…' : c
  const lines: string[] = []
  lines.push(`Consegna: ${room.title}`)
  lines.push(`Cliente: ${room.client}`)
  lines.push(`Riepilogo del ${new Date().toLocaleString('it-IT')}`)
  lines.push('')

  const reviewed = files.filter((f) => state.decisions[f.key] || state.comments[f.key])
  lines.push('FOTO')
  if (reviewed.length === 0) {
    lines.push('(nessun giudizio ancora)')
  } else {
    const shown = opts?.maxPhotos ? reviewed.slice(0, opts.maxPhotos) : reviewed
    for (const f of shown) {
      const d = state.decisions[f.key]
      const c = state.comments[f.key]
      const verdict = d === 'approved' ? 'Approvata' : d === 'changes' ? 'Da rivedere' : 'Da vedere'
      lines.push(`${f.label} — ${verdict}${c ? `: ${clip(c)}` : ''}`)
    }
    const rest = reviewed.length - shown.length
    if (rest > 0) lines.push(`(altre ${rest} voci nel riepilogo completo — copialo dalla stanza)`)
  }

  const favs = files.filter((f) => state.favorites[f.key])
  lines.push('')
  lines.push('PREFERITE')
  lines.push(favs.length > 0 ? favs.map((f) => f.label).join(', ') : '(nessuna)')

  return lines.join('\n')
}

export const FEEDBACK_EMAIL = DATA.identity.email

export function feedbackMailto(room: Room, summary: string): string {
  const subject = `Consegna "${room.title}" — riepilogo proofing`
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summary)}`
}
