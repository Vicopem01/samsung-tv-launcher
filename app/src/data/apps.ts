import type { InstalledApp } from '../lib/tvApps'

export type AppDefinition = {
  id: string
  name: string
  category: string
  /** Web version, used in the laptop preview. Empty for TV-only apps. */
  url: string
  accent: string
  background: string
  foreground: string
  /** Matches the installed TV app's name. */
  tvMatch?: RegExp
  /** Installed TV app ID, filled in on the TV. */
  tvId?: string
  /** The TV's own icon, for installed apps not in this catalog. */
  iconPath?: string
}

export const streamingApps: AppDefinition[] = [
  {
    id: 'netflix',
    tvMatch: /^netflix$/i,
    name: 'Netflix',
    category: 'Films & series',
    url: 'https://www.netflix.com/',
    accent: '#f4b6a7',
    background: '#3b191b',
    foreground: '#fff4ea',
  },
  {
    id: 'youtube',
    tvMatch: /^youtube$/i,
    name: 'YouTube',
    category: 'Videos & creators',
    url: 'https://www.youtube.com/',
    accent: '#ffd0c7',
    background: '#44201e',
    foreground: '#fff4ea',
  },
  {
    id: 'prime-video',
    tvMatch: /prime ?video/i,
    name: 'Prime Video',
    category: 'Films & series',
    url: 'https://www.primevideo.com/',
    accent: '#a8dfe3',
    background: '#153b43',
    foreground: '#eff9f5',
  },
  {
    id: 'disney-plus',
    tvMatch: /disney/i,
    name: 'Disney+',
    category: 'Stories & worlds',
    url: 'https://www.disneyplus.com/',
    accent: '#b8c9ef',
    background: '#182c4b',
    foreground: '#f3f5ee',
  },
  {
    id: 'crave',
    tvMatch: /^crave/i,
    name: 'Crave',
    category: 'Films & series',
    url: 'https://www.crave.ca/',
    accent: '#f4d58b',
    background: '#493a1d',
    foreground: '#fff7df',
  },
  {
    id: 'apple-tv',
    tvMatch: /^apple ?tv/i,
    name: 'Apple TV',
    category: 'Films & series',
    url: 'https://tv.apple.com/',
    accent: '#d7d8ce',
    background: '#292d2c',
    foreground: '#f6f5ee',
  },
  {
    id: 'tsn',
    tvMatch: /^tsn/i,
    name: 'TSN',
    category: 'Live sports',
    url: 'https://www.tsn.ca/',
    accent: '#f1a9a1',
    background: '#442023',
    foreground: '#fff2e8',
  },
  {
    id: 'dazn',
    tvMatch: /^dazn/i,
    name: 'DAZN',
    category: 'Live sports',
    url: 'https://www.dazn.com/',
    accent: '#f4f06e',
    background: '#25291f',
    foreground: '#f8f8e9',
  },
  {
    id: 'spotify',
    tvMatch: /^spotify/i,
    name: 'Spotify',
    category: 'Music & podcasts',
    url: 'https://open.spotify.com/',
    accent: '#a8e6bb',
    background: '#173b2a',
    foreground: '#eff9ee',
  },
  {
    id: 'apple-music',
    tvMatch: /^apple ?music/i,
    name: 'Apple Music',
    category: 'Music & radio',
    url: 'https://music.apple.com/',
    accent: '#f4b4c0',
    background: '#48232d',
    foreground: '#fff1ee',
  },
]

export const defaultFavoriteIds = streamingApps.slice(0, 8).map((app) => app.id)

/**
 * Placeholder packages the TV reports but that should never appear as tiles:
 * marketing stubs ("-dummy") and helper apps with no display name.
 */
function isPlaceholder(app: InstalledApp) {
  return !app.name.trim() || /dummy/i.test(app.id)
}

/**
 * The apps available on Home.
 * - Normal browser: the catalog above, opening web versions.
 * - TV: catalog apps that are installed (keeping their brand tiles, opening the real app),
 *   then every other installed app with the TV's own icon. Uninstalled catalog apps are left out.
 * `visibility` holds the per-app choices made in "Show or hide apps"; otherwise the automatic guess applies.
 */
export function buildAppList(
  supported: boolean,
  allInstalled: InstalledApp[] | null,
  visibility: Record<string, boolean> = {},
): AppDefinition[] {
  if (!supported) return streamingApps
  if (!allInstalled) return []

  const shown = visibleAppIds(allInstalled, visibility)
  const installed = allInstalled.filter((app) => shown.has(app.id) && !isPlaceholder(app))
  const used = new Set<string>()
  const known = streamingApps.flatMap((app) => {
    const match = installed.find((candidate) => (
      !used.has(candidate.id) && app.tvMatch?.test(candidate.name.trim())
    ))
    if (!match) return []
    used.add(match.id)
    return [{ ...app, tvId: match.id }]
  })

  const others = installed
    .filter((app) => !used.has(app.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((app): AppDefinition => ({
      id: `tv:${app.id}`,
      name: app.name.trim(),
      category: 'Installed app',
      url: '',
      accent: '#e9dcb8',
      background: '#26332e',
      foreground: '#f6f2e4',
      tvId: app.id,
      iconPath: app.iconPath,
    }))

  return [...known, ...others]
}

const matchesCatalog = (app: InstalledApp) => (
  app.show !== false && streamingApps.some((catalogApp) => catalogApp.tvMatch?.test(app.name))
)

/**
 * IDs of installed apps to show: the user's choice from "Show or hide apps" if made, otherwise
 * the automatic guess. Known catalog apps (Netflix, YouTube…) are always shown automatically,
 * and if the strict guess would show nothing at all, the looser one is used instead.
 */
export function visibleAppIds(all: InstalledApp[], visibility: Record<string, boolean>) {
  const strict = (app: InstalledApp) => app.autoVisible || matchesCatalog(app)
  const automatic = all.some(strict) ? strict : (app: InstalledApp) => app.looseVisible
  return new Set(all.filter((app) => visibility[app.id] ?? automatic(app)).map((app) => app.id))
}
