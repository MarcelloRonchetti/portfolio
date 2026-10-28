import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useParams } from 'react-router-dom'
import Clickable from '../components/Clickable'
import PhotoFrame from '../components/PhotoFrame'
import { useDriveContent } from '../hooks/useDriveContent'
import { listRoomPhotos } from '../lib/drive'
import type { DriveVideo } from '../lib/drive'
import { formatDate } from '../lib/format'
import {
  buildFeedbackSummary,
  feedbackMailto,
  isRoomUnlocked,
  loadRoomState,
  markRoomUnlocked,
  pushActivity,
  roomById,
  roomExpired,
  roomPhotoUrl,
  roomPhotos,
  saveRoomState,
  verifyRoomPassword,
} from '../lib/rooms'
import type { PhotoDecision, Room, RoomState } from '../lib/rooms'

// Must stay in sync with the dissolve animations in index.css.
const DISSOLVE_MS = 300

const pad2 = (n: number) => String(n).padStart(2, '0')

const clockOf = (at: number) =>
  new Date(at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

// 83000 → "1:23" — same format as the Videos page.
function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

type Tab = 'gallery' | 'films' | 'favorites'

const DECISION_LABEL: Record<PhotoDecision, string> = {
  approved: 'Approvata',
  changes: 'Da rivedere',
}

// One proofable image, whichever source backs the room: a local event file
// (key = file name) or a Drive photo (key = Drive file id, label = cleaned
// file name — ids are for storage, humans read labels).
type RoomItem = { key: string; label: string; thumb: string; full: string }

const countLabel = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// ── gate ──────────────────────────────────────────────────────────────────────

function GateScreen({ room, onUnlock }: { room: Room; onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  // crypto.subtle exists only in secure contexts: on a LAN/HTTP preview the
  // gate says so instead of rejecting the correct password as "non corretta".
  const noCrypto = typeof crypto === 'undefined' || !crypto.subtle

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (checking || noCrypto) return
    setChecking(true)
    setError(null)
    const ok = await verifyRoomPassword(room, value)
    setChecking(false)
    if (ok) {
      markRoomUnlocked(room)
      onUnlock()
    } else {
      setError('Password non corretta. Riprova o contatta lo studio.')
    }
  }

  return (
    <main className="section section-dark" style={{ paddingTop: 160, minHeight: '80vh' }}>
      <div className="container">
        <form className="room-gate" onSubmit={submit}>
          <div className="t-meta" style={{ color: 'var(--accent-inverse)' }}>
            Consegna clienti · accesso riservato
          </div>
          <h1 className="t-h1" style={{ margin: 0 }}>
            {room.title}
          </h1>
          <p className="t-italic" style={{ margin: 0, color: 'var(--muted-inverse)' }}>
            Galleria privata per {room.client}.
          </p>
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Password della consegna"
            autoComplete="off"
            aria-label="Password della consegna"
            autoFocus
          />
          {noCrypto ? (
            <p className="room-gate-error" role="alert">
              Verifica della password non disponibile in questo contesto: apri la consegna via
              HTTPS.
            </p>
          ) : (
            error && (
              <p className="room-gate-error" role="alert">
                {error}
              </p>
            )
          )}
          <button type="submit" className="room-btn room-btn-solid" disabled={checking || noCrypto}>
            {checking ? 'Verifica…' : 'Entra'}
          </button>
        </form>
      </div>
    </main>
  )
}

function ExpiredScreen({ room }: { room: Room }) {
  return (
    <main className="section section-dark" style={{ paddingTop: 160, minHeight: '80vh' }}>
      <div className="container">
        <div className="room-gate">
          <div className="t-meta" style={{ color: 'var(--accent-inverse)' }}>
            Consegna clienti
          </div>
          <h1 className="t-h1" style={{ margin: 0 }}>
            {room.title}
          </h1>
          <p className="t-italic" style={{ margin: 0, color: 'var(--muted-inverse)' }}>
            Questa consegna è scaduta il {formatDate(room.expires ?? '')}.{' '}
            Scrivi allo studio per riattivare l'accesso o ricevere una nuova selezione.
          </p>
        </div>
      </div>
    </main>
  )
}

// ── proofing tile actions ─────────────────────────────────────────────────────

function TileActions({
  decision,
  favorite,
  onDecision,
  onFavorite,
}: {
  decision?: PhotoDecision
  favorite: boolean
  onDecision: (d: PhotoDecision) => void
  onFavorite: () => void
}) {
  return (
    <div className="room-tile-actions">
      <span className={`room-status${decision ? ' room-status-set' : ''}`}>
        {decision ? DECISION_LABEL[decision] : 'Da vedere'}
      </span>
      <span className="room-tile-buttons">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDecision('approved')
          }}
          aria-pressed={decision === 'approved'}
          aria-label="Approva"
          title="Approva"
        >
          ✓
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDecision('changes')
          }}
          aria-pressed={decision === 'changes'}
          aria-label="Richiedi modifiche"
          title="Richiedi modifiche"
        >
          ✎
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onFavorite()
          }}
          aria-pressed={favorite}
          aria-label="Preferita"
          title="Preferita"
          className={favorite ? 'room-fav-on' : undefined}
        >
          ♥
        </button>
      </span>
    </div>
  )
}

// ── main room ─────────────────────────────────────────────────────────────────

export default function RoomPage() {
  const params = useParams()
  const rawId = params.roomId ?? ''
  const room = useMemo(() => roomById(rawId), [rawId])

  const drive = useDriveContent()
  const [unlocked, setUnlocked] = useState(() => (room ? isRoomUnlocked(room) : false))
  const [state, setState] = useState<RoomState>(() =>
    room ? loadRoomState(room.id) : { decisions: {}, comments: {}, favorites: {}, activity: [] }
  )
  const [tab, setTab] = useState<Tab>('gallery')
  const [proofIdx, setProofIdx] = useState<number | null>(null)
  const [proofClosing, setProofClosing] = useState(false)
  const [draftComment, setDraftComment] = useState('')
  const [playing, setPlaying] = useState<DriveVideo | null>(null)
  const [copied, setCopied] = useState(false)
  const [driveReload, setDriveReload] = useState(0)
  const copiedTimer = useRef<number>(0)

  // No reset-on-room-change effect here: AppShell keys .page-fade by pathname,
  // so a different /room/<id> remounts this component and state re-inits.
  const persist = useCallback(
    (next: RoomState) => {
      setState(next)
      if (room) saveRoomState(room.id, next)
    },
    [room]
  )

  // Private by design: keep delivery rooms out of search engines even though
  // GitHub Pages can't send an X-Robots-Tag header. The cleanup restores the
  // previous head state, so SPA-navigating away never leaks noindex (and the
  // room title) onto the public pages that follow.
  useEffect(() => {
    if (!room) return
    const prevTitle = document.title
    let meta = document.querySelector('meta[name="robots"]')
    const prevContent = meta?.getAttribute('content') ?? null
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex, nofollow')
    document.title = `${room.title} — Consegna clienti`
    return () => {
      if (prevContent === null) meta?.remove()
      else meta?.setAttribute('content', prevContent)
      document.title = prevTitle
    }
  }, [room])

  const expired = room ? roomExpired(room) : false
  const gate = room !== undefined && room.passwordHash !== undefined && !unlocked && !expired

  // Content sources: a local event (bundled photos, already-public work) or a
  // Drive folder (deliver work that is not published on the site yet).
  const items: RoomItem[] = useMemo(() => {
    if (!room || room.driveFolderId) return []
    return roomPhotos(room).map((f) => ({
      key: f,
      // Label senza estensione, come le raccolte Drive (gli id restano le chiavi).
      label: f.replace(/\.[a-z0-9]+$/i, ''),
      thumb: roomPhotoUrl(room, f),
      full: roomPhotoUrl(room, f),
    }))
  }, [room])

  const [driveItems, setDriveItems] = useState<
    { kind: 'loading' } | { kind: 'ready'; items: RoomItem[] } | { kind: 'error'; message: string }
  >({ kind: 'loading' })

  const canLoadDrive = !!room?.driveFolderId && !gate && !expired
  useEffect(() => {
    if (!canLoadDrive) return
    let cancelled = false
    listRoomPhotos(room!.driveFolderId!)
      .then((list) => {
        if (!cancelled) {
          setDriveItems({
            kind: 'ready',
            items: list.map((p) => ({
              key: p.id,
              label: p.name ?? p.id,
              thumb: p.thumbUrl,
              full: p.fullUrl,
            })),
          })
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setDriveItems({
            kind: 'error',
            message: e instanceof Error ? e.message : String(e),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [canLoadDrive, driveReload, room])

  const films = useMemo(() => {
    if (!room?.driveVideoCategory) return []
    return (drive.content?.videos ?? []).filter((v) => v.category === room.driveVideoCategory)
  }, [room, drive.content])

  // The Drive listing arrives async: a cold first visit must not flash a false
  // "Nessun film collegato" while the walk is still running (same discipline
  // as GalleryRoute's driveSettled).
  const driveSettled = !drive.configured || drive.content !== null || drive.error !== null

  const content: RoomItem[] = useMemo(() => {
    if (!room) return []
    if (room.driveFolderId) return driveItems.kind === 'ready' ? driveItems.items : []
    return items
  }, [room, driveItems, items])

  const favCount = content.filter((it) => state.favorites[it.key]).length
  const approvedCount = content.filter((it) => state.decisions[it.key] === 'approved').length
  const changesCount = content.filter((it) => state.decisions[it.key] === 'changes').length

  // Humans read labels, state is keyed by ids (stable across file renames).
  const labelOf = (key: string) => content.find((it) => it.key === key)?.label ?? key

  // The comment is written through to the room state on every keystroke, so
  // leaving via Esc, backdrop or ✕ can never discard the draft; the activity
  // entry is added on the first keystroke (deduped per photo).
  const onDraftChange = (v: string) => {
    setDraftComment(v)
    if (proofIdx === null) return
    const it = content[proofIdx]
    if (!it) return
    const comments = { ...state.comments, [it.key]: v }
    if (!v) delete comments[it.key]
    const label = `Commento su ${it.label}`
    const next = state.activity.some((a) => a.label === label)
      ? { ...state, comments }
      : pushActivity({ ...state, comments }, label)
    persist(next)
  }

  const closeProof = useCallback(() => {
    setProofClosing(true)
    window.setTimeout(() => {
      setProofIdx(null)
      setProofClosing(false)
    }, DISSOLVE_MS)
  }, [])

  const openProof = useCallback(
    (i: number) => {
      setProofClosing(false)
      setProofIdx(i)
      const it = content[i]
      setDraftComment(it ? (state.comments[it.key] ?? '') : '')
    },
    [content, state]
  )

  useEffect(() => {
    if (proofIdx === null && !playing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeProof()
        setPlaying(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [proofIdx, playing, closeProof])

  useEffect(() => {
    if (proofIdx === null && !playing) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [proofIdx, playing])

  if (!room) return <Navigate to="/" replace />
  if (expired) return <ExpiredScreen room={room} />
  if (gate) return <GateScreen room={room} onUnlock={() => setUnlocked(true)} />

  const setDecision = (key: string, d: PhotoDecision) => {
    const decisions = { ...state.decisions }
    const removing = decisions[key] === d
    if (removing) delete decisions[key]
    else decisions[key] = d
    persist(
      pushActivity(
        { ...state, decisions },
        removing ? `Giudizio rimosso: ${labelOf(key)}` : `${DECISION_LABEL[d]}: ${labelOf(key)}`
      )
    )
  }

  const toggleFavorite = (key: string) => {
    const next = {
      ...state,
      favorites: { ...state.favorites, [key]: !state.favorites[key] },
    }
    persist(
      pushActivity(
        next,
        `${next.favorites[key] ? 'Preferita' : 'Rimossa dalle preferite'}: ${labelOf(key)}`
      )
    )
  }

  const summaryItems = content.map((it) => ({ key: it.key, label: it.label }))

  const copySummary = async () => {
    const summary = buildFeedbackSummary(room, state, summaryItems)
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2500)
      persist(pushActivity(state, 'Riepilogo copiato'))
    } catch {
      // Stesso cap della mail della toolbar: i client mail troncano gli URL
      // mailto lunghi, il fallback non deve ricadere nel riepilogo integrale.
      window.open(
        feedbackMailto(
          room,
          buildFeedbackSummary(room, state, summaryItems, { maxComment: 140, maxPhotos: 12 })
        ),
        '_self'
      )
    }
  }

  const proofItem = proofIdx !== null ? content[Math.min(proofIdx, content.length - 1)] : null
  const proofDecision = proofItem ? state.decisions[proofItem.key] : undefined
  const proofFavorite = proofItem ? !!state.favorites[proofItem.key] : false

  const gridFor = (list: RoomItem[]) => (
    <div className="room-grid">
      {list.map((it) => {
        const i = content.indexOf(it)
        return (
          <div key={it.key} className="room-tile">
            <PhotoFrame
              src={it.thumb}
              alt={`${room.title} — ${it.label}`}
              ratio="3 / 2"
              onClick={() => openProof(i)}
              style={{ cursor: 'zoom-in' }}
            >
              {room.watermark && (
                <span className="room-watermark" aria-hidden="true">
                  Marcello Ronchetti
                </span>
              )}
            </PhotoFrame>
            <TileActions
              decision={state.decisions[it.key]}
              favorite={!!state.favorites[it.key]}
              onDecision={(d) => setDecision(it.key, d)}
              onFavorite={() => toggleFavorite(it.key)}
            />
          </div>
        )
      })}
    </div>
  )

  const filmMeta = !room.driveVideoCategory
    ? ''
    : driveSettled
      ? ` · ${films.length} film`
      : ' · film…'

  return (
    <main className="section section-dark" style={{ paddingTop: 120, paddingBottom: 90 }}>
      <div className="container">
        <div className="section-head">
          <div className="stack" style={{ gap: 6 }}>
            <div className="t-meta" style={{ color: 'var(--accent-inverse)' }}>
              Consegna clienti
            </div>
            <h1 className="t-h1" style={{ margin: 0 }}>
              {room.title}
            </h1>
            {room.note && (
              <p className="t-italic" style={{ margin: 0, color: 'var(--muted-inverse)', maxWidth: 640 }}>
                {room.note}
              </p>
            )}
          </div>
          <div
            className="t-meta"
            style={{ color: 'var(--muted-inverse)', textAlign: 'right', marginLeft: 'auto' }}
          >
            <div>
              {content.length} foto{filmMeta}
            </div>
            <div style={{ marginTop: 6 }}>
              {room.expires ? `scade ${formatDate(room.expires)}` : 'nessuna scadenza'}
              {room.watermark && ' · filigrana sulle foto'}
              {!room.downloads && ' · download non attivo'}
            </div>
          </div>
        </div>

        <p className="t-meta" style={{ color: 'var(--muted-inverse)', margin: '0 0 22px' }}>
          {countLabel(approvedCount, 'approvata', 'approvate')} ·{' '}
          {countLabel(changesCount, 'da rivedere', 'da rivedere')} ·{' '}
          {countLabel(favCount, 'preferita', 'preferite')} — {room.client}
        </p>

        <div className="catnav">
          {(
            [
              ['gallery', 'Galleria'],
              ['films', 'Film'],
              ['favorites', `Preferiti (${favCount})`],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="t-meta"
              data-active={tab === t || undefined}
              aria-pressed={tab === t}
              style={{
                color: tab === t ? 'var(--accent-inverse)' : 'var(--muted-inverse)',
                borderBottom: tab === t ? '1px solid var(--accent-inverse)' : '1px solid transparent',
                paddingBottom: 4,
                whiteSpace: 'nowrap',
                transition: 'color 0.2s, border-color 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="room-toolbar">
          <button className="room-btn" onClick={copySummary}>
            {copied ? 'Copiato ✓' : 'Copia riepilogo'}
          </button>
          <a
            className="room-btn"
            href={feedbackMailto(
              room,
              buildFeedbackSummary(room, state, summaryItems, { maxComment: 140, maxPhotos: 12 })
            )}
          >
            Invia via email
          </a>
        </div>

        {tab === 'gallery' &&
          (room.driveFolderId && driveItems.kind === 'loading' ? (
            <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
              Caricamento della selezione dall'archivio…
            </p>
          ) : room.driveFolderId && driveItems.kind === 'error' ? (
            <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
              {driveItems.message}{' '}
              <button
                className="t-meta"
                style={{ color: 'var(--accent-inverse)' }}
                onClick={() => {
                  setDriveItems({ kind: 'loading' })
                  setDriveReload((n) => n + 1)
                }}
              >
                Riprova
              </button>
            </p>
          ) : (
            gridFor(content)
          ))}

        {tab === 'films' && (
          <div className="grid-cards">
            {films.map((v) => (
              <Clickable key={v.id} className="card" onClick={() => setPlaying(v)}>
                <div className="card-photo">
                  <img
                    src={v.posterUrl}
                    alt={v.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="video-play" aria-hidden="true">▷</div>
                  {v.durationMs != null && (
                    <div className="video-duration">{formatDuration(v.durationMs)}</div>
                  )}
                </div>
                <div className="card-body">
                  <div className="card-title">{v.title}</div>
                  <div className="card-sub">{v.category}</div>
                  <div className="card-count">{v.qualityLabel}</div>
                </div>
              </Clickable>
            ))}
            {films.length === 0 && (
              <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
                {!room.driveVideoCategory
                  ? 'Nessun film collegato a questa consegna.'
                  : !drive.configured
                    ? 'Filmati non disponibili: archivio Drive non collegato.'
                    : !driveSettled
                      ? 'Caricamento dei film dall\'archivio…'
                      : drive.error
                        ? `${drive.error} `
                        : 'Nessun film collegato a questa consegna.'}
                {room.driveVideoCategory && drive.error && driveSettled && (
                  <button
                    className="t-meta"
                    style={{ color: 'var(--accent-inverse)' }}
                    onClick={drive.refresh}
                  >
                    Riprova
                  </button>
                )}
              </p>
            )}
          </div>
        )}

        {tab === 'favorites' &&
          (favCount === 0 ? (
            <p className="t-italic" style={{ color: 'var(--muted-inverse)' }}>
              Nessuna preferita: tocca il cuore sulle foto che ti piacciono di più.
            </p>
          ) : (
            gridFor(content.filter((it) => state.favorites[it.key]))
          ))}

        {state.activity.length > 0 && (
          <details className="room-activity">
            <summary className="t-meta">Attività su questo dispositivo</summary>
            <ul>
              {state.activity.slice(0, 6).map((a, i) => (
                <li key={`${a.at}-${i}`} className="t-meta">
                  <span>{clockOf(a.at)}</span> {a.label}
                </li>
              ))}
            </ul>
            <p className="t-meta" style={{ color: 'var(--muted-inverse)' }}>
              Giudizi e note restano su questo dispositivo: invia il riepilogo per farli arrivare a
              Marcello.
            </p>
          </details>
        )}

        {/* Portals to <body>: .page-fade keeps a transform, so any fixed
            overlay rendered inside it would center on the document instead of
            the viewport (see AGENTS.md §Transizioni). */}
        {proofItem && createPortal(
          <div
            className="room-proofbox"
            data-closing={proofClosing || undefined}
            onClick={closeProof}
            role="dialog"
            aria-modal="true"
            aria-label={`Revisione ${proofItem.label}`}
          >
            <button className="video-lightbox-close" onClick={closeProof} aria-label="Chiudi" autoFocus>
              ✕
            </button>
            <div className="room-proofbox-inner" onClick={(e) => e.stopPropagation()}>
              <div className="room-proofbox-media">
                <img src={proofItem.full} alt={`${room.title} — ${proofItem.label}`} />
                {room.watermark && (
                  <span className="room-watermark" aria-hidden="true">
                    Marcello Ronchetti
                  </span>
                )}
              </div>
              <div className="room-proofbox-panel">
                <div className="t-meta" style={{ color: 'var(--muted-inverse)' }}>
                  {pad2((proofIdx ?? 0) + 1)} / {pad2(content.length)} · {proofItem.label}
                </div>
                <TileActions
                  decision={proofDecision}
                  favorite={proofFavorite}
                  onDecision={(d) => proofItem && setDecision(proofItem.key, d)}
                  onFavorite={() => proofItem && toggleFavorite(proofItem.key)}
                />
                {room.downloads && (
                  <a
                    className="room-btn"
                    href={proofItem.full}
                    {...(room.driveFolderId
                      ? { target: '_blank' as const, rel: 'noopener noreferrer' }
                      : { download: proofItem.key })}
                  >
                    {room.driveFolderId ? "Apri l'originale" : "Scarica l'originale"}
                  </a>
                )}
                <textarea
                  value={draftComment}
                  onChange={(e) => onDraftChange(e.target.value)}
                  placeholder="Note per il fotografo (max 500 caratteri)…"
                  maxLength={500}
                  rows={3}
                  aria-label="Nota per il fotografo"
                />
              </div>
            </div>
          </div>,
          document.body
        )}

        {playing && createPortal(
          <div
            className="video-lightbox"
            onClick={() => setPlaying(null)}
            role="dialog"
            aria-modal="true"
            aria-label={playing.title}
          >
            <button
              className="video-lightbox-close"
              onClick={() => setPlaying(null)}
              aria-label="Chiudi il video"
              autoFocus
            >
              ✕
            </button>
            <div className="video-lightbox-inner" onClick={(e) => e.stopPropagation()}>
              <div className="t-meta" style={{ color: 'var(--ink-inverse)', marginBottom: 12 }}>
                {playing.title} · {playing.qualityLabel}
              </div>
              <video
                controls
                autoPlay
                playsInline
                preload="metadata"
                poster={playing.posterLg}
                src={playing.streamUrl}
                onError={() => setPlaying(null)}
              />
            </div>
          </div>,
          document.body
        )}
      </div>
    </main>
  )
}
