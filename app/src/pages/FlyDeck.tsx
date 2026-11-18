import type { CSSProperties, RefObject } from 'react'
import type { FlyTarget } from '../lib/flyTargets'
import Clickable from '../components/Clickable'

// ── FlyDeck: la pila di stampe in CSS 3D ────────────────────────────────────
// NON è l'esperienza principale: è la riserva di FlyThrough mentre il chunk
// WebGL carica, e il degradamento definitivo dove la scena non arriva
// (niente contesto GL, chunk non caricato). Le pose vivono in Cover.css.

type FlyDeckProps = {
  targets: FlyTarget[]
  offsets: number[]
  movedRef: RefObject<boolean>
  onPick: (i: number) => void
  onPrefetchExperience: () => void
  /** true = la pila è solo un attesa del chunk WebGL (aria-hidden + inert);
      false = è l'interfaccia definitiva e resta pienamente accessibile. */
  ariaHidden?: boolean
}

export default function FlyDeck({
  targets,
  offsets,
  movedRef,
  onPick,
  onPrefetchExperience,
  ariaHidden = false,
}: FlyDeckProps) {
  return (
    <div
      className="fly-world"
      aria-hidden={ariaHidden || undefined}
      inert={ariaHidden || undefined}
    >
      {targets.map((t, i) => {
        const off = offsets[i]
        const front = off === 0
        return (
          <div
            key={t.route}
            className="fly-card"
            data-offset={off}
            style={{ zIndex: 10 - Math.abs(off), '--i': i } as CSSProperties}
          >
            <Clickable
              className="fly-hit"
              aria-label={front ? `Entra in ${t.label}` : `Porta davanti ${t.label}`}
              onClick={() => {
                if (movedRef.current) {
                  movedRef.current = false
                  return
                }
                onPick(i)
              }}
              onMouseEnter={t.route === 'experience' ? onPrefetchExperience : undefined}
              onFocus={t.route === 'experience' ? onPrefetchExperience : undefined}
            >
              <div className="fly-frame">
                <img src={t.img} alt="" draggable={false} />
                <span className="fly-glare" aria-hidden="true" />
                <span className="fly-num" aria-hidden="true">
                  0{i + 1}
                </span>
                <span className="fly-caption">
                  <span className="fly-caption-label">{t.label}</span>
                  <span className="fly-caption-note">{t.note}</span>
                  <span className="fly-caption-cta" aria-hidden="true">
                    Entra <span className="fly-caption-arrow">→</span>
                  </span>
                </span>
              </div>
            </Clickable>
          </div>
        )
      })}
    </div>
  )
}
