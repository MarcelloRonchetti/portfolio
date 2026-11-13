// View-Transition wrapper for SPA route changes. React-router's own
// `viewTransition` navigate option never invoked document.startViewTransition
// in this setup (measured 2026-11-13: navigation happened, vtCalls = 0), so we
// wrap manually with the standard pattern: render the route change
// synchronously (flushSync) inside the transition callback — the browser then
// animates old/new snapshots with the ::view-transition CSS in index.css
// ("zoom-through": the camera passes through the old page into the new one).
import { flushSync } from 'react-dom'
import type { NavigateOptions, To } from 'react-router-dom'

export function vtNavigate(
  navigate: (to: To, opts?: NavigateOptions) => void,
  to: To,
  opts?: NavigateOptions
) {
  const reduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  if (typeof document.startViewTransition !== 'function' || reduced) {
    navigate(to, opts)
    return
  }
  document.startViewTransition(() => {
    flushSync(() => navigate(to, opts))
  })
}
