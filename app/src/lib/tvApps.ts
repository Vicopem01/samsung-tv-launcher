/**
 * Installed TV apps via the Tizen Application API (getAppsInfo / launch).
 */
import { withTimeout } from './tizen'
import type { TizenInstalledApp } from './tizen'

export type InstalledApp = TizenInstalledApp & {
  /** Strict guess at whether this is a real app rather than a system service. Overridable on the TV. */
  autoVisible: boolean
  /** Looser guess, used if the strict one would leave nothing at all. */
  looseVisible: boolean
}

/** Installed apps never shown by default, by exact app ID. */
export const hiddenAppIds: string[] = []

/** Consumer apps that ship preinstalled with system-style IDs. */
const PRELOADED_APPS = new Set(['org.tizen.netflix-app', 'org.tizen.primevideo', 'org.tizen.browser'])

/** Samsung app-store IDs: 10 characters + name, or a long number. Most system components use other forms. */
const STORE_ID = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/
const NUMERIC_ID = /^\d{9,13}$/

/** Background services that the TV still marks as visible. */
const NOISE = /service|worker|daemon|agent|plugin|widget|preview|promotion|launcher|factory|dummy|e-?manual|adplayer|privacy|security|^ep[ -]/i

function looksUserFacing(app: TizenInstalledApp) {
  if (PRELOADED_APPS.has(app.id)) return true
  if (app.show === false) return false
  if (!STORE_ID.test(app.id) && !NUMERIC_ID.test(app.id)) return false
  return !NOISE.test(`${app.name} ${app.id}`)
}

/** For the laptop preview and tests: localStorage 'ourhome-mock-installed-apps' = '[{"id":"…","name":"…","show":true}]'. */
const MOCK_KEY = 'ourhome-mock-installed-apps'

function readMock(): TizenInstalledApp[] | null {
  try {
    const raw = window.localStorage.getItem(MOCK_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((app): app is TizenInstalledApp => (
      Boolean(app) && typeof app.id === 'string' && typeof app.name === 'string'
    ))
  } catch {
    return null
  }
}

/** True on the TV, or when a preview mock is set; false in a normal browser. */
export function canReadInstalledApps() {
  return Boolean(window.tizen?.application) || readMock() !== null
}

/** Every app the TV reports (minus this one), each marked with whether it is shown by default. Throws if the TV fails. */
export async function readInstalledApps(): Promise<InstalledApp[] | null> {
  const mock = readMock()
  const application = window.tizen?.application
  let apps: TizenInstalledApp[]

  if (mock) {
    apps = mock
  } else if (application) {
    // Errors propagate so the reason can be shown on screen.
    const result: unknown = await withTimeout<unknown>((resolve, reject) => application.getAppsInfo(resolve, reject))
    if (!Array.isArray(result)) throw new Error(`The TV returned ${typeof result} instead of an app list`)
    apps = result as TizenInstalledApp[]
  } else {
    return null
  }

  let selfId = ''
  try {
    selfId = application?.getCurrentApplication?.().appInfo.id ?? ''
  } catch {
    // Not running as an installed TV app.
  }

  const seen = new Set<string>()
  return apps
    .filter((app) => {
      if (!app || typeof app.id !== 'string' || typeof app.name !== 'string') return false
      if (!app.name.trim() || app.id === selfId || seen.has(app.id)) return false
      seen.add(app.id)
      return true
    })
    .map((app): InstalledApp => {
      const hidden = hiddenAppIds.includes(app.id)
      // Copy fields one by one: the TV's objects may expose them as getters that `...app` would skip.
      return {
        id: app.id,
        name: app.name.trim(),
        iconPath: typeof app.iconPath === 'string' ? app.iconPath : undefined,
        show: app.show,
        autoVisible: !hidden && looksUserFacing(app),
        looseVisible: !hidden && app.show !== false && !NOISE.test(`${app.name} ${app.id}`),
      }
    })
}

/** True when apps can be launched on the TV itself. */
export function canLaunchTvApps() {
  return Boolean(window.tizen?.application)
}

export function launchTvApp(id: string) {
  const application = window.tizen?.application
  if (!application) return Promise.reject(new Error('Not running on the TV'))
  return withTimeout<void>((resolve, reject) => application.launch(id, () => resolve(), reject))
}

/** Readable text for an error from the TV (Tizen WebAPIException has name + message). */
export function describeError(error: unknown) {
  if (error && typeof error === 'object') {
    const { name, message } = error as { name?: unknown; message?: unknown }
    const parts = [name, message].filter((part) => typeof part === 'string' && part)
    if (parts.length) return parts.join(': ')
  }
  return String(error)
}
