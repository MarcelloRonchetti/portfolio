// View-Transition wrapper for SPA route changes. React-router's own
// `viewTransition` navigate option never invoked document.startViewTransition
// in this setup (measured 2026-11-13: navigation happened, vtCalls = 0), so we
// wrap manually with the standard pattern: render the route change
// synchronously (flushSync) inside the transition callback — the browser then
// animates old/new snapshots with the ::view-transition CSS in index.css
// ("zoom-through": the camera passes through the old page into the new one).
import { flushSync } from 'react-dom'
import type { NavigateOptions, To } from 'react-router-dom'

// Una seconda View Transition che parte mentre la prima vola: il browser la
// gestirebbe (skip della precedente), ma i nostri stili di percorso si
// rimescolano a metà volo — es. html[data-vt="lightbox"] rimosso a 0.38s
// farebbe RIPARTIRE i keyframe della zoom-through già in corso. Finché una
// VT è in corso le nuove richieste degradano al path senza VT: coerente,
// senza morph asimmetrici, e il .page-fade di fallback copre la navigazione.
let vtInFlight = false

// Osserva la VT senza lasciare rumore: `finished`, `ready` e
// `updateCallbackDone` rifiutano per skip legittimi (doppio click in gara,
// documento nascosto a metà volo, transizione abortita, callback che throwa) —
// senza .catch diventano unhandledrejection a ogni skip, nel log del browser.
// `onSettle` scatta comunque, skippata o no.
function observeVt(
  vt: {
    finished: Promise<unknown>
    ready?: Promise<unknown>
    updateCallbackDone?: Promise<unknown>
  },
  onSettle?: () => void
) {
  void Promise.resolve(vt.finished)
    .finally(() => onSettle?.())
    .catch(() => {})
  if (vt.ready) void Promise.resolve(vt.ready).catch(() => {})
  if (vt.updateCallbackDone) void Promise.resolve(vt.updateCallbackDone).catch(() => {})
}

export function vtNavigate(
  navigate: (to: To, opts?: NavigateOptions) => void,
  to: To,
  opts?: NavigateOptions
) {
  const reduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  if (vtInFlight || typeof document.startViewTransition !== 'function' || reduced) {
    navigate(to, opts)
    return
  }
  vtInFlight = true
  let vt: ReturnType<typeof document.startViewTransition>
  try {
    vt = document.startViewTransition(() => {
      flushSync(() => navigate(to, opts))
    })
  } catch {
    // Edge da documento non completamente attivo: la VT non parte — si
    // naviga e si rilascia il lock, senza lasciare lo stato incastriato.
    vtInFlight = false
    navigate(to, opts)
    return
  }
  observeVt(vt, () => {
    vtInFlight = false
  })
}

// Stessa wrapper per le transizioni di overlay in-pagina (apertura lightbox):
// il chiamante passa l'update di stato e noi lo rendiamo sincrono dentro una
// View Transition, così i morph a elemento condiviso
// (::view-transition-group(lightbox-hero)) hanno snapshot vero vecchio/nuovo.
// `kind` marca l'html per la durata della transizione: il CSS di percorso
// (vuoto, sweep, zoom-through) si ritira e lascia il tempo al gruppo
// condiviso — vedi html[data-vt="lightbox"] in index.css.
export function vtTransition(update: () => void, kind?: 'lightbox') {
  const reduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  if (vtInFlight || typeof document.startViewTransition !== 'function' || reduced) {
    update()
    return
  }
  const root = document.documentElement
  if (kind) root.setAttribute('data-vt', kind)
  vtInFlight = true
  let vt: ReturnType<typeof document.startViewTransition>
  try {
    vt = document.startViewTransition(() => {
      flushSync(update)
    })
  } catch {
    if (kind) root.removeAttribute('data-vt')
    vtInFlight = false
    update()
    return
  }
  // `finished` si chiude anche quando la VT viene skippata: l'attributo non
  // resta mai appeso e il rifiuto non diventa rumore in console.
  observeVt(vt, () => {
    if (kind) root.removeAttribute('data-vt')
    vtInFlight = false
  })
}
