export type ConsoleBrand = 'playstation' | 'xbox' | 'nintendo' | 'generic'

export type ConsoleDefinition = {
  id: string
  name: string
  /** HDMI port number on the TV. */
  port: number
  brand: ConsoleBrand
  accent: string
  background: string
  /** True for a connected port that isn't listed below. */
  unrecognized?: boolean
}

export const household = {
  /**
   * City used for the weather in the top-right corner, e.g. 'Toronto'.
   * Leave empty to hide the weather. Looked up with Open-Meteo (no account or key).
   */
  weatherCity: 'Mississauga',
  temperatureUnit: 'celsius' as 'celsius' | 'fahrenheit',
}

/**
 * Consoles you have, or may plug in later, and the HDMI port each one uses.
 * On the TV, a console only appears while something is connected to its port,
 * so it's fine to list one you don't own yet.
 */
export const consoles: ConsoleDefinition[] = [
  { id: 'playstation-5', name: 'PlayStation 5', port: 1, brand: 'playstation', accent: '#a9c1ff', background: '#16264a' },
  { id: 'xbox', name: 'Xbox', port: 2, brand: 'xbox', accent: '#a6e3ae', background: '#16351f' },
  { id: 'nintendo-switch', name: 'Nintendo Switch', port: 3, brand: 'nintendo', accent: '#ffb3ab', background: '#4a1b1e' },
]

export const inputSettings = {
  /** Show a generic tile for connected HDMI ports that aren't in the list above. */
  showUnlistedPorts: true,
  /** Ports to never show, e.g. a soundbar on the eARC port: [4]. */
  ignoredPorts: [] as number[],
}

const unlistedStyle = { accent: '#e9dcb8', background: '#2b3430' }

/** Which console tiles to show for the current HDMI status. */
export function visibleConsoles(supported: boolean, status: Record<number, boolean> | null): ConsoleDefinition[] {
  if (!supported) return consoles
  if (!status) return []

  const ignored = new Set(inputSettings.ignoredPorts)
  const listedPorts = new Set(consoles.map((device) => device.port))
  const listed = consoles.filter((device) => status[device.port] === true && !ignored.has(device.port))
  const unlisted = inputSettings.showUnlistedPorts
    ? Object.keys(status)
      .map(Number)
      .filter((port) => status[port] && !listedPorts.has(port) && !ignored.has(port))
      .sort((a, b) => a - b)
      .map((port): ConsoleDefinition => ({
        id: `hdmi-${port}`,
        name: `HDMI ${port}`,
        port,
        brand: 'generic',
        unrecognized: true,
        ...unlistedStyle,
      }))
    : []
  return [...listed, ...unlisted]
}
