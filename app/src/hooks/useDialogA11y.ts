import { useCallback, useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])'

// Shared a11y floor for the fullscreen overlays (photo lightbox, video
// player): the dialog is focused on open — unless the overlay already moved
// focus to an inner control (the player's autoFocus close button wins) —
// focus returns to the opener on close, the page behind is frozen, and the
// keydown floor runs while the overlay is up: Escape closes, arrow keys step
// (when the caller passes onStep) and Tab is cycled among the focusable
// elements INSIDE the dialog. aria-modal="true" promises an inert background;
// the trap is what keeps that promise.
//
// `active` is the fully-open state (open && !closing): during the dissolve-out
// the listener is gone, so keys can't re-trigger a close that is playing.
export function useDialogA11y({
  active,
  onClose,
  onStep,
  openerRef,
}: {
  active: boolean
  onClose: () => void
  onStep?: (dir: 1 | -1) => void
  openerRef: RefObject<HTMLElement | null>
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  // Callback ref for the dialog element; it mounts with the portal.
  const ref = useCallback((node: HTMLDivElement | null) => {
    dialogRef.current = node
  }, [])

  useEffect(() => {
    if (!active) {
      openerRef.current?.focus({ preventScroll: true })
      openerRef.current = null
      return
    }
    const node = dialogRef.current
    if (!node) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!node.contains(document.activeElement)) {
      node.focus({ preventScroll: true })
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowRight' && onStep) {
        onStep(1)
        return
      }
      if (e.key === 'ArrowLeft' && onStep) {
        onStep(-1)
        return
      }
      if (e.key !== 'Tab') return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.getClientRects().length > 0
      )
      if (items.length === 0) {
        e.preventDefault()
        node.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (e.shiftKey) {
        if (current === first || current === node) {
          e.preventDefault()
          last.focus()
        }
      } else if (current === last || current === node) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [active, onClose, onStep, openerRef])

  return ref
}
