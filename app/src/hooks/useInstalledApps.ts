import { useEffect, useRef, useState } from 'react'
import { canReadInstalledApps, describeError, readInstalledApps } from '../lib/tvApps'
import type { InstalledApp } from '../lib/tvApps'

/** Give up waiting and say so, even if the TV never answers or errors. */
const NO_ANSWER_MS = 12_000

/**
 * - `supported: false` → normal browser: use the built-in catalog.
 * - `apps: null` while the first reading is in progress on the TV.
 * - `error`: why the list couldn't be read (only while no list has been read yet).
 * Re-reads when Home comes back on screen, so new installs appear without a restart.
 */
export function useInstalledApps() {
  const [supported] = useState(canReadInstalledApps)
  const [apps, setApps] = useState<InstalledApp[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const refreshRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!supported) return
    let cancelled = false
    let inFlight = false

    const refresh = () => {
      if (inFlight) return
      inFlight = true
      readInstalledApps()
        .then((next) => {
          if (cancelled) return
          if (next) {
            setApps(next)
            setError(null)
          } else {
            setError('The TV did not provide an app list')
          }
        })
        .catch((caught: unknown) => {
          if (!cancelled) setError(describeError(caught))
        })
        .finally(() => {
          inFlight = false
        })
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const noAnswer = window.setTimeout(() => {
      if (!cancelled) setError((current) => current ?? `No answer from the TV after ${NO_ANSWER_MS / 1000} seconds`)
    }, NO_ANSWER_MS)

    refreshRef.current = refresh
    refresh()
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      cancelled = true
      window.clearTimeout(noAnswer)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [supported])

  return {
    supported,
    apps,
    error: apps === null ? error : null,
    retry: () => refreshRef.current(),
  }
}
