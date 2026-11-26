import { useEffect, useState } from 'react'
import { canDetectHdmi, readHdmiStatus } from '../lib/tvInputs'
import type { HdmiStatus } from '../lib/tvInputs'

/**
 * - `supported: false` → can't detect (normal browser): show every configured console.
 * - `status: null` while the first reading is in progress on the TV.
 * Read on start and whenever Home comes back on screen — not on a timer, because TV
 * system calls can briefly stall the screen. A failed reading keeps the last good status.
 */
export function useHdmiStatus() {
  const [supported] = useState(canDetectHdmi)
  const [status, setStatus] = useState<HdmiStatus | null>(null)

  useEffect(() => {
    if (!supported) return
    let cancelled = false
    let inFlight = false

    const refresh = () => {
      if (inFlight) return
      inFlight = true
      readHdmiStatus()
        .then((next) => {
          if (!cancelled && next) setStatus(next)
        })
        .finally(() => {
          inFlight = false
        })
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    refresh()
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [supported])

  return { supported, status }
}
