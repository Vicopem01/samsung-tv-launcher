import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  LayoutGrid,
  Moon,
  Pin,
  PinOff,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  TreePine,
  Tv,
} from 'lucide-react'
import { AppIcon } from './components/AppIcon'
import { ChristmasScene, Snowfall } from './components/ChristmasScene'
import { ConsoleIcon } from './components/ConsoleIcon'
import { HomeDialog } from './components/HomeDialog'
import { buildAppList, defaultFavoriteIds, streamingApps } from './data/apps'
import type { AppDefinition } from './data/apps'
import { household, visibleConsoles } from './data/home'
import type { ConsoleDefinition } from './data/home'
import { useHdmiStatus } from './hooks/useHdmiStatus'
import { useInstalledApps } from './hooks/useInstalledApps'
import { canLaunchTvApps, launchTvApp } from './lib/tvApps'
import { usePersistentState } from './hooks/usePersistentState'
import { useStageScale } from './hooks/useStageScale'
import { describeWeather, useWeather } from './hooks/useWeather'
import type { WeatherReport } from './hooks/useWeather'
import { arrowDirections, focusAndReveal, focusableElements, focusIsLost, moveFocus } from './lib/spatialNav'
import './App.css'

type DialogName = 'all-apps' | 'arrange' | null

const validAppIds = new Set(streamingApps.map((app) => app.id))

// System destinations that get dedicated UI instead of appearing in the app lists.
const smartHubId = 'com.samsung.tv.csfs'
const systemAppIds = new Set([smartHubId, 'OurHome001.Home'])

// Pins are kept even if the app isn't installed right now; they reappear if it is reinstalled.
function validatePinnedApps(value: unknown): string[] {
  if (!Array.isArray(value)) return defaultFavoriteIds
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
}

function validateRecent(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readLegacyPins(): string[] {
  try {
    const oldOrder: unknown = JSON.parse(window.localStorage.getItem('parkside-favorite-order') ?? 'null')
    const oldHidden: unknown = JSON.parse(window.localStorage.getItem('parkside-hidden-apps') ?? '[]')
    if (!Array.isArray(oldOrder)) return defaultFavoriteIds
    const hidden = new Set(Array.isArray(oldHidden) ? oldHidden : [])
    return [...new Set(oldOrder.filter(
      (id): id is string => typeof id === 'string' && validAppIds.has(id) && !hidden.has(id),
    ))]
  } catch {
    return defaultFavoriteIds
  }
}

function readWeatherCity() {
  try {
    return window.localStorage.getItem('ourhome-weather-city') ?? household.weatherCity
  } catch {
    return household.weatherCity
  }
}

function appStyle(app: AppDefinition) {
  return {
    '--tile-accent': app.accent,
    '--tile-background': app.background,
    '--tile-foreground': app.foreground,
  } as CSSProperties
}

function greetingFor(date: Date) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function WeatherIcon({ report, size }: { report: WeatherReport; size: number }) {
  const props = { size, strokeWidth: 1.6, 'aria-hidden': true }
  const { code, isDay } = report
  if (code === 0) return isDay ? <Sun {...props} /> : <Moon {...props} />
  if (code <= 2) return isDay ? <CloudSun {...props} /> : <CloudMoon {...props} />
  if (code === 45 || code === 48) return <CloudFog {...props} />
  if (code >= 51 && code <= 57) return <CloudDrizzle {...props} />
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return <CloudSnow {...props} />
  if (code >= 95) return <CloudLightning {...props} />
  if (code >= 61) return <CloudRain {...props} />
  return <Cloud {...props} />
}

function AppTile({ app, onOpen }: {
  app: AppDefinition
  onOpen: (app: AppDefinition) => void
}) {
  return (
    <button className="app-tile" style={appStyle(app)} onClick={() => onOpen(app)} aria-label={`Open ${app.name}`}>
      <span className="tile-art"><AppIcon appId={app.id} iconPath={app.iconPath} name={app.name} size={76} /></span>
      <span className="tile-name">{app.name}</span>
    </button>
  )
}

function ConsoleTile({ device, onOpen }: { device: ConsoleDefinition; onOpen: (device: ConsoleDefinition) => void }) {
  const style = { '--tile-accent': device.accent, '--tile-background': device.background } as CSSProperties
  return (
    <button className="console-tile" style={style} onClick={() => onOpen(device)} aria-label={`Switch to ${device.name}`}>
      <span className="console-icon"><ConsoleIcon brand={device.brand} size={50} /></span>
      <span className="console-text">
        <strong>{device.name}</strong>
        <small>{device.unrecognized ? 'New device' : `HDMI ${device.port}`}</small>
      </span>
    </button>
  )
}

export default function App() {
  const stage = useStageScale()
  const [stageElement, setStageElement] = useState<HTMLDivElement | null>(null)
  const homeRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLButtonElement>(null)
  const emptyActionRef = useRef<HTMLButtonElement>(null)
  const [now, setNow] = useState(() => new Date())
  const [legacyPins] = useState(readLegacyPins)
  const [pinnedIds, setPinnedIds] = usePersistentState('ourhome-pinned-apps', legacyPins, validatePinnedApps)
  const [recentId, setRecentId] = usePersistentState('ourhome-recent-app', '', validateRecent)
  const [weatherCity] = useState(readWeatherCity)
  const weather = useWeather(weatherCity, household.temperatureUnit)
  const installed = useInstalledApps()
  const discoveredApps = installed.apps?.filter((app) => !systemAppIds.has(app.id)) ?? null
  const allApps = buildAppList(installed.supported, discoveredApps)
  const hdmi = useHdmiStatus()
  const consoles = visibleConsoles(hdmi.supported, hdmi.status)
  const [activeDialog, setActiveDialog] = useState<DialogName>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 20_000)
    return () => window.clearInterval(timer)
  }, [])

  // On the TV the app list arrives a moment after start, so focus the big card
  // (or the "Show or hide apps" button when nothing is shown) once it exists.
  const heroReady = allApps.length > 0
  const listState = installed.apps ? 'ready' : installed.error ? 'error' : 'loading'
  useEffect(() => {
    if (document.activeElement === document.body || !document.activeElement) {
      ;(heroRef.current ?? emptyActionRef.current)?.focus({ preventScroll: true })
    }
  }, [heroReady, listState])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const notify = (message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3200)
  }

  const pinnedApps = pinnedIds
    .map((id) => allApps.find((app) => app.id === id))
    .filter((app): app is AppDefinition => Boolean(app))
  const recentApp: AppDefinition | undefined = allApps.find((app) => app.id === recentId) ?? pinnedApps[0] ?? allApps[0]
  const arrangeOrder = [
    ...pinnedApps,
    ...allApps.filter((app) => !pinnedIds.includes(app.id)),
  ]

  const launchApp = (app: AppDefinition) => {
    setRecentId(app.id)
    setActiveDialog(null)

    if (app.tvId && canLaunchTvApps()) {
      launchTvApp(app.tvId).catch(() => notify(`${app.name} didn't open. Please try again.`))
      return
    }
    if (!app.url) {
      notify(`${app.name} opens on the TV`)
      return
    }
    const newWindow = window.open(app.url, '_blank')
    if (newWindow) {
      newWindow.opener = null
      notify(`Opening ${app.name}`)
    } else {
      notify(`Allow pop-ups to open ${app.name} from this preview`)
    }
  }

  const switchToConsole = (device: ConsoleDefinition) => {
    notify(`${device.name} is on HDMI ${device.port}. Switching inputs isn't built yet; it comes with the TV install.`)
  }

  const openSmartHub = () => {
    if (canLaunchTvApps()) {
      launchTvApp(smartHubId).catch(() => notify("Smart Hub didn't open. Please try again."))
      return
    }
    notify('Smart Hub opens on the TV')
  }

  const togglePin = (app: AppDefinition) => {
    const isPinned = pinnedIds.includes(app.id)
    setPinnedIds((current) => isPinned ? current.filter((id) => id !== app.id) : [...current, app.id])
    notify(isPinned ? `${app.name} removed from Home` : `${app.name} added to Home`)
  }

  const moveApp = (id: string, direction: -1 | 1) => {
    setPinnedIds((current) => {
      const index = current.indexOf(id)
      const destination = index + direction
      if (index < 0 || destination < 0 || destination >= current.length) return current
      const updated = [...current]
      ;[updated[index], updated[destination]] = [updated[destination], updated[index]]
      return updated
    })
  }

  const resetLayout = () => {
    setPinnedIds(defaultFavoriteIds)
    notify('Home is back to its original apps')
  }

  const currentRoot = () => (activeDialog
    ? stageElement?.querySelector<HTMLElement>('[role="dialog"]')
    : homeRef.current)

  /** Put focus somewhere sensible when it has been lost (e.g. the selected item was removed). */
  const rescueFocus = () => {
    if (activeDialog) {
      const dialog = currentRoot()
      if (dialog) focusAndReveal(focusableElements(dialog)[0])
    } else {
      focusAndReveal(heroRef.current ?? emptyActionRef.current)
    }
  }

  /** After a change re-renders a list, keep the selection on the same control (or a fallback). */
  const keepFocus = (key: string, fallbackKey?: string) => {
    window.requestAnimationFrame(() => {
      const find = (focusKey: string) => document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(focusKey)}"]:not([disabled])`)
      const target = find(key) ?? (fallbackKey ? find(fallbackKey) : null)
      if (target) focusAndReveal(target)
      else if (focusIsLost(currentRoot())) rescueFocus()
    })
  }

  const handleKeyDown = (event: globalThis.KeyboardEvent) => {
    const isTvBack = event.keyCode === 10009 || event.key === 'BrowserBack' || event.key === 'XF86Back'
    if (isTvBack || event.key === 'Escape') {
      if (activeDialog) {
        // Radix closes dialogs on Escape itself; the TV Back key needs closing here.
        if (isTvBack) {
          event.preventDefault()
          setActiveDialog(null)
        }
        return
      }
      event.preventDefault()
      focusAndReveal(heroRef.current ?? emptyActionRef.current)
      return
    }

    if (!activeDialog && /^[1-9]$/.test(event.key)) {
      const app = pinnedApps[Number(event.key) - 1]
      if (app) {
        event.preventDefault()
        launchApp(app)
      }
      return
    }

    const direction = arrowDirections[event.key]
    const root = currentRoot()

    // Nothing selected: the first arrow or OK press just selects something instead of being lost.
    if ((direction || event.key === 'Enter') && focusIsLost(root)) {
      event.preventDefault()
      rescueFocus()
      return
    }

    if (!direction) return
    event.preventDefault()
    if (root) moveFocus(root, document.activeElement, direction)
  }

  // Listen on the whole page, so remote keys still arrive when nothing inside the app has focus.
  const keyHandler = useRef(handleKeyDown)
  useEffect(() => {
    keyHandler.current = handleKeyDown
  })
  useEffect(() => {
    const listener = (event: globalThis.KeyboardEvent) => keyHandler.current(event)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [])

  const timeLabel = new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(now)
  const dateLabel = new Intl.DateTimeFormat('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }).format(now)

  return (
    <div className="tv-viewport">
      <div
        ref={setStageElement}
        className="tv-stage"
        style={stage.scale === 1 ? undefined : { transform: `scale(${stage.scale})`, left: stage.left, top: stage.top }}
      >
        <div className="scene-layer">
          <ChristmasScene />
        </div>
        <div className="scene-scrim" aria-hidden="true" />
        <Snowfall />
        <div className="home" ref={homeRef}>
          <header className="topbar">
            <div className="brand">
              <span className="brand-mark"><TreePine size={34} strokeWidth={1.8} aria-hidden="true" /></span>
              <div>
                <p>{greetingFor(now)}</p>
              </div>
            </div>

            <div className="info-panel">
              {weather && (
                <div className="weather" aria-label={`${weather.place}: ${weather.temperature} degrees, ${describeWeather(weather.code)}`}>
                  <WeatherIcon report={weather} size={58} />
                  <div className="weather-now">
                    <strong>{weather.temperature}°</strong>
                    <span>{describeWeather(weather.code)}</span>
                  </div>
                  <div className="weather-range">
                    <span>H {weather.high}°</span>
                    <span>L {weather.low}°</span>
                  </div>
                </div>
              )}
              <div className="clock">
                <time dateTime={now.toISOString()}>{timeLabel}</time>
                <span>{dateLabel}</span>
              </div>
            </div>
          </header>

          <section className="hero-section" aria-label="Most recent app">
            {recentApp ? (
            <button
              ref={heroRef}
              className="hero-card"
              data-nav-down=".shelf-row .app-tile"
              style={appStyle(recentApp)}
              onClick={() => launchApp(recentApp)}
              aria-label={`Open ${recentApp.name}`}
            >
              <span className="hero-text">
                <span className="hero-eyebrow">{recentId ? 'Jump back in' : 'Ready when you are'}</span>
                <span className="hero-name">{recentApp.name}</span>
                <span className="hero-meta">{recentApp.category}</span>
                <span className="hero-action"><Play size={26} fill="currentColor" aria-hidden="true" /> Open</span>
              </span>
              <span className="hero-art"><AppIcon appId={recentApp.id} iconPath={recentApp.iconPath} name={recentApp.name} size={120} /></span>
            </button>
            ) : (
              <div className="hero-card hero-placeholder">
                <span className="hero-text">
                  <span className="hero-eyebrow">{installed.error ? 'Something went wrong' : 'One moment'}</span>
                  <span className="hero-meta">
                    {installed.error
                      ? "The TV didn't share its app list."
                      : installed.apps
                        ? 'No apps are shown yet. Choose which apps to show.'
                        : 'Loading your apps…'}
                  </span>
                  {installed.error && <span className="hero-error">{installed.error}</span>}
                  {installed.error && (
                    <button ref={emptyActionRef} className="primary-button" onClick={() => installed.retry()}>
                      <RotateCcw size={26} aria-hidden="true" /> Try again
                    </button>
                  )}
                </span>
              </div>
            )}
          </section>

          <section className="shelf" aria-labelledby="apps-title">
            <div className="shelf-heading">
              <h2 id="apps-title">Apps</h2>
            </div>
            <div className="shelf-row" data-scroll-area>
              {pinnedApps.map((app) => (
                <AppTile key={app.id} app={app} onOpen={launchApp} />
              ))}
              <button className="app-tile all-apps-tile" onClick={() => setActiveDialog('all-apps')}>
                <span className="tile-art"><LayoutGrid size={70} strokeWidth={1.6} aria-hidden="true" /></span>
                <span className="tile-name">All apps</span>
              </button>
            </div>
          </section>

          {consoles.length > 0 && (
            <section className="shelf" aria-labelledby="consoles-title">
              <div className="shelf-heading">
                <h2 id="consoles-title">Consoles</h2>
              </div>
              <div className="shelf-row" data-scroll-area>
                {consoles.map((device) => (
                  <ConsoleTile key={device.id} device={device} onOpen={switchToConsole} />
                ))}
              </div>
            </section>
          )}

          <footer className="system-footer">
            <button className="system-link" onClick={openSmartHub}>
              <Tv size={24} strokeWidth={1.8} aria-hidden="true" /> Smart Hub
            </button>
          </footer>
        </div>

        <HomeDialog
          open={activeDialog === 'all-apps'}
          onOpenChange={(open) => setActiveDialog(open ? 'all-apps' : null)}
          title="All apps"
          description="Open any app, or add it to the Apps row on Home."
          className="apps-dialog"
          container={stageElement}
        >
          <div className="collection-grid" data-scroll-area>
            {allApps.map((app) => {
              const isPinned = pinnedIds.includes(app.id)
              return (
                <div className="collection-item" key={app.id}>
                  <button className="collection-launch" onClick={() => launchApp(app)} aria-label={`Open ${app.name}`}>
                    <span className="collection-icon" style={{ background: app.background }}><AppIcon appId={app.id} iconPath={app.iconPath} name={app.name} size={40} /></span>
                    <span className="collection-text"><strong>{app.name}</strong><small>{app.category}</small></span>
                  </button>
                  <button
                    className={`icon-button collection-pin ${isPinned ? 'is-pinned' : ''}`}
                    data-focus-key={`collection:${app.id}:pin`}
                    onClick={() => { togglePin(app); keepFocus(`collection:${app.id}:pin`) }}
                    aria-label={`${isPinned ? 'Remove' : 'Add'} ${app.name} ${isPinned ? 'from' : 'to'} Home`}
                    aria-pressed={isPinned}
                  >
                    {isPinned ? <PinOff size={28} aria-hidden="true" /> : <Pin size={28} aria-hidden="true" />}
                  </button>
                </div>
              )
            })}
          </div>
          <div className="dialog-actions">
            <div className="dialog-actions-start">
              <button className="secondary-button" onClick={() => setActiveDialog('arrange')}>
                <SlidersHorizontal size={26} aria-hidden="true" /> Arrange Home
              </button>
            </div>
            <button className="primary-button" onClick={() => setActiveDialog(null)}>
              Done <Check size={26} aria-hidden="true" />
            </button>
          </div>
        </HomeDialog>

        <HomeDialog
          open={activeDialog === 'arrange'}
          onOpenChange={(open) => setActiveDialog(open ? 'arrange' : null)}
          title="Arrange Home"
          description="Choose which apps appear on Home and put them in order."
          className="arrange-dialog"
          container={stageElement}
        >
          <div className="arrange-list" data-scroll-area>
            {arrangeOrder.map((app) => {
              const isPinned = pinnedIds.includes(app.id)
              const pinnedIndex = pinnedIds.indexOf(app.id)
              return (
                <div className={`arrange-row ${isPinned ? '' : 'is-unpinned'}`} key={app.id}>
                  <span className="arrange-icon" style={{ background: app.background }}><AppIcon appId={app.id} iconPath={app.iconPath} name={app.name} size={30} /></span>
                  <span className="arrange-name">
                    <strong>{app.name}</strong>
                    <small>{isPinned ? `Position ${pinnedIndex + 1}` : 'Not on Home'}</small>
                  </span>
                  <button
                    className="icon-button"
                    data-focus-key={`arrange:${app.id}:up`}
                    onClick={() => { moveApp(app.id, -1); keepFocus(`arrange:${app.id}:up`, `arrange:${app.id}:down`) }}
                    disabled={!isPinned || pinnedIndex === 0}
                    aria-label={`Move ${app.name} earlier`}
                  ><ArrowUp size={26} /></button>
                  <button
                    className="icon-button"
                    data-focus-key={`arrange:${app.id}:down`}
                    onClick={() => { moveApp(app.id, 1); keepFocus(`arrange:${app.id}:down`, `arrange:${app.id}:up`) }}
                    disabled={!isPinned || pinnedIndex === pinnedIds.length - 1}
                    aria-label={`Move ${app.name} later`}
                  ><ArrowDown size={26} /></button>
                  <button
                    className={`pin-button ${isPinned ? 'is-pinned' : ''}`}
                    data-focus-key={`arrange:${app.id}:pin`}
                    onClick={() => { togglePin(app); keepFocus(`arrange:${app.id}:pin`) }}
                    aria-label={`${isPinned ? 'Remove' : 'Add'} ${app.name} ${isPinned ? 'from' : 'to'} Home`}
                    aria-pressed={isPinned}
                  >
                    {isPinned ? 'On Home' : 'Add'}
                  </button>
                </div>
              )
            })}
          </div>
          <div className="dialog-actions">
            <div className="dialog-actions-end">
              <button className="secondary-button" onClick={resetLayout}>
                <RotateCcw size={24} aria-hidden="true" /> Reset
              </button>
              <button className="primary-button" onClick={() => setActiveDialog(null)}>
                Done <Check size={26} aria-hidden="true" />
              </button>
            </div>
          </div>
        </HomeDialog>

        <div className={`toast ${toast ? 'is-visible' : ''}`} role="status" aria-live="polite">
          {toast}
        </div>
      </div>
    </div>
  )
}
