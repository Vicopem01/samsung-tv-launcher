/** Minimal types for the Samsung Tizen web APIs this app uses. Absent in a normal browser. */

export type TizenInstalledApp = {
  id: string
  name: string
  iconPath?: string
  show?: boolean
}

export type TizenVideoSourceInfo = { type: string; number: number }
export type TizenVideoSource = { connected?: TizenVideoSourceInfo[]; disconnected?: TizenVideoSourceInfo[] }

export type Tizen = {
  tvinputdevice?: {
    registerKey: (keyName: string) => void
  }
  application?: {
    getAppsInfo: (onSuccess: (apps: TizenInstalledApp[]) => void, onError?: (error: unknown) => void) => void
    launch: (id: string, onSuccess?: () => void, onError?: (error: unknown) => void) => void
    getCurrentApplication?: () => { appInfo: { id: string } }
  }
  systeminfo?: {
    getPropertyValue: (
      property: 'VIDEOSOURCE',
      onSuccess: (value: TizenVideoSource) => void,
      onError?: (error: unknown) => void,
    ) => void
  }
}

declare global {
  interface Window {
    tizen?: Tizen
  }
}

/**
 * The TV only sends some remote keys to apps that ask for them. Arrows, OK, and Back are
 * delivered by default; number keys must be registered.
 */
export function registerRemoteKeys() {
  const input = window.tizen?.tvinputdevice
  if (!input) return
  for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
    try {
      input.registerKey(key)
    } catch {
      // Unsupported key on this model; the rest still work.
    }
  }
}

/** Resolve a Tizen callback-style call, failing after 8 seconds. */
export function withTimeout<T>(executor: (resolve: (value: T) => void, reject: (error: unknown) => void) => void) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('The TV did not respond')), 8000)
    executor(
      (value) => { window.clearTimeout(timer); resolve(value) },
      (error) => { window.clearTimeout(timer); reject(error) },
    )
  })
}
