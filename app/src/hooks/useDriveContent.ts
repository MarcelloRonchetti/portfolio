import { useCallback, useEffect, useRef, useState } from 'react'
import { DriveError, clearDriveCache, loadDriveContent, peekDriveCache } from '../lib/drive'
import type { DriveContent } from '../lib/drive'
import { isDriveConfigured } from '../lib/driveConfig'

type DriveState = {
  configured: boolean
  content: DriveContent | null
  loading: boolean
  error: string | null
}

// Shared Drive archive state: first load starts on mount (cached content loads
// synchronously so a warm cache never flashes a skeleton), `refresh` bypasses
// the cache.
export function useDriveContent(): DriveState & { refresh: () => void } {
  const configured = isDriveConfigured()
  const [state, setState] = useState<DriveState>(() => {
    const cached = configured ? peekDriveCache() : null
    return {
      configured,
      content: cached,
      loading: configured && cached === null,
      error: null,
    }
  })
  const inFlight = useRef(false)
  const lastRefreshAt = useRef(0)
  const inError = useRef(false)

  const run = useCallback(async (force: boolean) => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const content = await loadDriveContent({ force })
      inError.current = false
      setState({ configured: true, content, loading: false, error: null })
    } catch (e) {
      inError.current = true
      const msg =
        e instanceof DriveError ? e.message : 'Errore di rete verso Google Drive.'
      setState({ configured: true, content: null, loading: false, error: msg })
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    if (!configured) return
    void run(false)
  }, [configured, run])

  const refresh = useCallback(() => {
    // Cooldown: a full archive walk costs a dozen of API calls — don't let
    // repeated clicks burn the (shared, referrer-restricted) API key quota.
    // Bypassed while in error state: "Riprova" is the only recovery path and
    // must never be a silent no-op.
    const now = Date.now()
    if (!inError.current && now - lastRefreshAt.current < 30_000) return
    lastRefreshAt.current = now
    clearDriveCache()
    void run(true)
  }, [run])

  return { ...state, refresh }
}
