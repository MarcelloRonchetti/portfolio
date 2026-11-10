import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Clickable from './Clickable'

// Carosello stile Instagram per le pagine storia (PhotoStory / DriveStory) e
// i loro lightbox: si trascina per scorrere (mouse e touch, con follow del
// dito e riaffermazione al rilascio) e la cornice anima larghezza/altezza
// fino al rapporto della foto attiva — nessuna banda laterale sulle
// verticali. Le slide scorrono su una track traslata; un salto dal rail
// (più di una posizione) non anima, come su Instagram.
//
// Le proporzioni non sono nei manifest: si misurano dall'immagine al load
// (fallback 3/2 finché non arriva la misura — il frame si sistema da solo).

export type CarouselSlide = {
  key: string
  src: string
  alt?: string
  /** Full-resolution copy (lightbox scene only): fades over the already
   *  visible `src` once decoded, so zooming in never flashes a blank frame.
   *  Absent → the lightbox shows `src` alone (local photos are ≤1080px). */
  zoomSrc?: string
}

type StoryCarouselProps = {
  slides: CarouselSlide[]
  activeIdx: number
  onActiveChange?: (idx: number) => void
  /** Altezza massima della cornice, in px (il chiamante la deriva dal viewport). */
  maxH: number
  /** Larghezza massima in px; se omessa si misura il contenitore. */
  maxW?: number
  /** Overlay didascalia sul bordo basso della cornice (es. contatore). */
  caption?: { left?: string; right?: string }
  /** Click/Enter sulla foto (solo scena storia: apre il lightbox). */
  onActivate?: () => void
  activateLabel?: string
  /** Frecce sul bordo della cornice (solo scena storia: nel lightbox ci sono
      già le .lightbox-nav del dialog — due set si sovrapporrebbero). */
  arrows?: boolean
  label?: string
  className?: string
}

const RATIO_FALLBACK = 3 / 2
// Oltre questa frazione della cornice il gesto diventa uno step.
const DRAG_COMMIT_FRACTION = 0.2
const DRAG_COMMIT_MIN = 48
// Sotto questa distanza il click resta un click (non un gesto interrotto).
const DRAG_CLICK_EPS = 6

export default function StoryCarousel({
  slides,
  activeIdx,
  onActiveChange,
  maxH,
  maxW,
  caption,
  onActivate,
  activateLabel,
  arrows = false,
  label,
  className,
}: StoryCarouselProps) {
  const [ratios, setRatios] = useState<Record<string, number>>({})
  // Slide il cui src è fallito (hiccups CDN su Drive): ricade sulla zoomSrc
  // quando esiste, altrimenti resta la cornice neutra come faceva PhotoFrame.
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  // Slide cadute DUE volte (base e fallback): nessuna img — cornice neutra,
  // mai l'icona di immagine rotta.
  const [dead, setDead] = useState<Record<string, boolean>>({})
  // Zoom già arrivato (per slide): resta montato e senza refade per tutta la
  // vita del carosello — un passo avanti/indietro non riavvia il download.
  const [zoomReady, setZoomReady] = useState<Record<string, boolean>>({})
  const wrapperRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [wrapW, setWrapW] = useState(0)

  // Trascinamento: dx in stato (serve al render della track), il resto in ref
  // (identità stabile fra gli eventi pointer).
  const [dragDx, setDragDx] = useState<number | null>(null)
  const dragRef = useRef<{ startX: number; id: number } | null>(null)
  const dxRef = useRef(0)
  // Un gesto che ha superato la soglia di click annulla l'attivazione (zoom)
  // e la chiusura del lightbox sul click che segue il pointerup.
  const draggedRef = useRef(false)

  const n = slides.length
  const idx = Math.min(Math.max(activeIdx, 0), n - 1)
  const atStart = idx <= 0
  const atEnd = idx >= n - 1

  // Larghezza del contenitore (scena storia): la griglia dà una colonna che
  // cambia con la finestra, quindi si misura (layout effect: niente frame
  // con la larghezza sbagliata) e si segue col ResizeObserver.
  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    setWrapW(el.clientWidth)
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const effMaxW = maxW ?? wrapW

  // Geometria: ogni slide è larga quanto la SUA foto (mai più larga di
  // maxW/maxH); la cornice prende larghezza e altezza della slide attiva.
  const geom = useMemo(() => {
    const widths = slides.map((s) => {
      const r = ratios[s.key] ?? RATIO_FALLBACK
      return Math.max(1, Math.round(Math.min(effMaxW || Infinity, maxH * r)))
    })
    const offsets: number[] = []
    let acc = 0
    for (const w of widths) {
      offsets.push(acc)
      acc += w
    }
    const w = widths[idx] ?? 0
    const h = Math.round(w / (ratios[slides[idx]?.key] ?? RATIO_FALLBACK))
    return { widths, offsets, w, h }
  }, [slides, ratios, effMaxW, maxH, idx])

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!onActiveChange || n === 0) return
      onActiveChange(Math.min(n - 1, Math.max(0, idx + dir)))
    },
    [onActiveChange, n, idx]
  )

  // ── pointer drag ──
  const onPointerDown = (e: React.PointerEvent) => {
    if (n < 2) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('.carousel-nav')) return
    dragRef.current = { startX: e.clientX, id: e.pointerId }
    dxRef.current = 0
    draggedRef.current = false
    // NIENTE setPointerCapture qui: con la cattura attiva il browser
    // ritargetta il click successivo sulla cornice e il click sulla foto
    // (apertura lightbox) muore. La cattura parte solo quando il gesto
    // diventa un trascinamento (vedi onPointerMove).
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.id !== e.pointerId) return
    let dx = e.clientX - drag.startX
    if (!draggedRef.current && Math.abs(dx) > DRAG_CLICK_EPS) {
      draggedRef.current = true
      // Gesto confermato come drag: cattura il puntatore così il trascinamento
      // continua anche fuori dalla cornice. Pointer id sintetici (test,
      // automazioni) non sono catturabili — il drag funziona comunque finché
      // il puntatore resta nella cornice.
      try {
        frameRef.current?.setPointerCapture(drag.id)
      } catch {
        /* nessun puntatore attivo con questo id */
      }
    }
    // Gomma elastica sui bordi: non c'è wrap nello scorrimento.
    if ((atStart && dx > 0) || (atEnd && dx < 0)) dx *= 0.3
    dxRef.current = dx
    setDragDx(dx)
  }

  const endDrag = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (drag && drag.id !== e.pointerId) return
    dragRef.current = null
    if (!drag) return
    const dx = dxRef.current
    setDragDx(null)
    dxRef.current = 0
    const threshold = Math.max(DRAG_COMMIT_MIN, geom.w * DRAG_COMMIT_FRACTION)
    if (dx <= -threshold) step(1)
    else if (dx >= threshold) step(-1)
    // else: riaffermazione — la track torna con la sua transizione.
  }

  // pointercancel (scroll verticale che ha preso il gesto, cambio finestra):
  // il trascinamento si annulla — mai un commit su un gesto che il browser
  // ha ripreso con touch-action: pan-y.
  const cancelDrag = (e: React.PointerEvent) => {
    if (dragRef.current && dragRef.current.id !== e.pointerId) return
    dragRef.current = null
    setDragDx(null)
    dxRef.current = 0
  }

  // Il click che segue un trascinamento non deve aprire il lightbox né
  // chiudere il lightbox stesso: intercettato in capture e fermato.
  const onClickCapture = (e: React.MouseEvent) => {
    if (!draggedRef.current) return
    draggedRef.current = false
    e.stopPropagation()
    e.preventDefault()
  }

  // Frecce sulla scena (nel lightbox le gestisce useDialogA11y quando il
  // focus è sul dialog; qui fermano la propagazione per non raddoppiare lo
  // step quando il focus è su una freccia dentro la cornice).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
      step(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      e.stopPropagation()
      step(-1)
    }
  }

  // Salto dal rail (più di una posizione): la track non deve attraversare
  // tutte le slide — un frame senza transizione, poi si riabilita. Il cleanup
  // riabilita la transizione anche se un altro cambio arriva prima del rAF
  // (doppio click sul rail): altrimenti `transition: none` resterebbe incollato.
  const prevIdxRef = useRef(idx)
  useLayoutEffect(() => {
    const jump = Math.abs(idx - prevIdxRef.current) > 1
    prevIdxRef.current = idx
    const el = trackRef.current
    if (!jump || !el) return
    el.style.transition = 'none'
    void el.offsetWidth
    const raf = requestAnimationFrame(() => {
      el.style.transition = ''
    })
    return () => {
      cancelAnimationFrame(raf)
      el.style.transition = ''
    }
  }, [idx])

  // Proporzioni dall'immagine: si registrano una volta per slide; il frame
  // si ridimensiona da solo quando la misura arriva.
  const recordRatio = useCallback((key: string, ratio: number) => {
    setRatios((prev) => (prev[key] ? prev : { ...prev, [key]: ratio }))
  }, [])

  if (n === 0) return null

  const showNav = n > 1 && onActiveChange && arrows
  const offset = geom.offsets[idx] ?? 0

  return (
    <div
      ref={wrapperRef}
      className={className ? `carousel ${className}` : 'carousel'}
      role="group"
      aria-roledescription="carosello"
      aria-label={label}
      data-scene={onActivate ? 'stage' : 'lightbox'}
      onClickCapture={onClickCapture}
    >
      <div
        ref={frameRef}
        className="carousel-frame"
        style={{ width: geom.w || undefined, height: geom.h || undefined }}
        data-dragging={dragDx !== null || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        onKeyDown={onKeyDown}
      >
        <div
          ref={trackRef}
          className="carousel-track"
          style={{ transform: `translateX(${-(offset - (dragDx ?? 0))}px)` }}
        >
          {slides.map((s, i) => {
            // Finestra ±1: le slide lontane restano segnaposto (stessa
            // geometria) finché non servono — niente download a monte.
            const near = Math.abs(i - idx) <= 1
            // Con zoomSrc la base (displayUrl) che fallisce ricade sulla s0 in
            // ENTRAMBE le scene: un hiccup del CDN non deve lasciare la cornice
            // neutra quando l'originale risponde. L'overlay di upgrade invece
            // vive solo nel lightbox: la s0 copre la base già visibile appena
            // decodificata — mai un frame grigio al passaggio al grande.
            const hasZoom = !!s.zoomSrc
            const baseFailed = !!failed[s.key]
            const gone = !!dead[s.key]
            const baseSrc = baseFailed && hasZoom ? s.zoomSrc! : s.src
            return (
              // aria-hidden sulle slide fuori fuoco: il lettore di schermo
              // sente una foto sola (le vicine sono nel DOM solo per la
              // transizione, invisibili dietro overflow: hidden).
              <div
                key={s.key}
                className="carousel-slide"
                style={{ width: geom.widths[i] }}
                aria-hidden={i !== idx || undefined}
              >
                {near && !gone && (hasZoom || !baseFailed) && (
                  <img
                    src={baseSrc}
                    alt={s.alt ?? ''}
                    draggable={false}
                    decoding="async"
                    ref={(img) => {
                      if (img && img.complete && img.naturalWidth > 0)
                        recordRatio(s.key, img.naturalWidth / img.naturalHeight)
                    }}
                    onLoad={(e) => {
                      const img = e.currentTarget
                      if (img.naturalWidth > 0)
                        recordRatio(s.key, img.naturalWidth / img.naturalHeight)
                    }}
                    onError={(e) => {
                      // Caduto anche il fallback (l'img sta già mostrando la
                      // zoomSrc): la slide esce — cornice neutra, mai l'icona
                      // di immagine rotta.
                      if (hasZoom && e.currentTarget.src === s.zoomSrc) {
                        setDead((prev) => ({ ...prev, [s.key]: true }))
                      }
                      setFailed((prev) => ({ ...prev, [s.key]: true }))
                    }}
                  />
                )}
                {near && !onActivate && hasZoom && !baseFailed && (
                  <img
                    className="carousel-zoom-img"
                    src={s.zoomSrc}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    decoding="async"
                    data-zoom={zoomReady[s.key] || undefined}
                    onLoad={() =>
                      setZoomReady((prev) => (prev[s.key] ? prev : { ...prev, [s.key]: true }))
                    }
                    // Sotto la s0 c'è sempre la base w1600: un errore qui non
                    // lascia niente di rotto a schermo, si prosegue con la base.
                    onError={() => setZoomReady((prev) => ({ ...prev, [s.key]: true }))}
                  />
                )}
              </div>
            )
          })}
        </div>
        {caption && (caption.left || caption.right) && (
          <div className="frame-caption">
            <span>{caption.left}</span>
            <span>{caption.right}</span>
          </div>
        )}
        {onActivate && (
          <Clickable
            className="carousel-zoom"
            onClick={onActivate}
            aria-label={activateLabel ?? 'Ingrandisci la foto'}
          />
        )}
        {/* Frecce sempre montate finché c'è più di una foto: ai bordi restano
            focusabili ma aria-disabled (il clamp rende il click un no-op) —
            smontarle farebbe cadere il focus a body se erano focalizzate. */}
        {showNav && (
          <button
            type="button"
            className="carousel-nav carousel-nav-prev"
            aria-label="Foto precedente"
            aria-disabled={atStart || undefined}
            onClick={(e) => {
              e.stopPropagation()
              step(-1)
            }}
          >
            ←
          </button>
        )}
        {showNav && (
          <button
            type="button"
            className="carousel-nav carousel-nav-next"
            aria-label="Foto successiva"
            aria-disabled={atEnd || undefined}
            onClick={(e) => {
              e.stopPropagation()
              step(1)
            }}
          >
            →
          </button>
        )}
      </div>
    </div>
  )
}
