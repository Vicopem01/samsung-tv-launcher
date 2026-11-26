# Our Home — Christmas TV launcher

A calm, app-first TV Home prototype on an original snowy Christmas backdrop. Layout, inspired by [arn0-tv](https://github.com/NelsonEU/arn0-tv):

- **Top left:** household name and greeting. **Top right:** weather and clock.
- **One big card** for the most recently opened app. It is focused on start, so OK opens it straight away.
- **Apps row:** pinned apps, ending with an **All apps** tile.
- **Consoles row:** HDMI devices.

No recommendations, promotions, lights, or day/night switching.

## Run

```sh
npm install
npm run dev -- --host 0.0.0.0 --port 7100
```

The screen is a fixed 1920×1080 stage scaled to fit the window, so a laptop preview matches the TV.

## Configure

Edit `src/data/home.ts`:

- `weatherCity`: e.g. `'Toronto'`. Empty hides the weather. Data comes from Open-Meteo (no key); the city name is sent to their geocoding service.
- `temperatureUnit`: `'celsius'` or `'fahrenheit'`.
- `consoles`: names and HDMI ports of consoles you have or may plug in later.
- `inputSettings.showUnlistedPorts` / `ignoredPorts`: show other connected ports as "New device" tiles, except ports like a soundbar's.

### Automatic console detection

On the TV, the app asks the TV which HDMI ports are connected (Tizen `systeminfo` `VIDEOSOURCE`) on start, every 15 seconds, and whenever Home comes back on screen. A console tile only shows while its port is connected, so listing a console you don't own yet is fine.

Detection works per **port**, not per device: whatever is plugged into port 3 shows as "Nintendo Switch". Whether a console that is off but still plugged in counts as connected depends on the TV and console, so check this on the TV.

In a normal browser nothing can be detected, so every listed console shows. To simulate the TV in a preview, run this in the browser console and reload:

```js
localStorage.setItem('ourhome-mock-hdmi', JSON.stringify({ 1: true, 2: true, 3: false }))
// remove with: localStorage.removeItem('ourhome-mock-hdmi')
```

Apps are listed in `src/data/apps.ts`.

### Installed apps

On the TV, the app reads the installed app list (Tizen `application.getAppsInfo`) on start and whenever Home comes back on screen:

- Catalog apps in `src/data/apps.ts` are matched to installed apps by name (`tvMatch`), keep their brand tiles, and open the real TV app.
- Catalog apps that aren't installed are left out. Their pins are kept, so they come back if reinstalled.
- Every other installed app appears in **All apps** with the TV's own icon and can be added to Home.
- Background services are filtered out. Hide any other clutter by adding its app ID to `hiddenAppIds` in `src/lib/tvApps.ts`.

In a normal browser the catalog is used and apps open their web versions. To simulate the TV's list in a preview:

```js
localStorage.setItem('ourhome-mock-installed-apps', JSON.stringify([{ id: 'x.netflix', name: 'Netflix', show: true }]))
```

## Controls

- Arrow keys / remote arrows: move to the nearest item in that direction
- Enter / OK: open
- Number keys 1–9: open the pinned app in that position
- Escape / TV Back: close a dialog, or return to the big recent-app card

## Customising Home

**All apps** → add or remove apps from Home. **Arrange Home** → reorder, remove, or reset. Settings are saved in this browser's `localStorage` only.

## Install on the TV

`npm run build:tv` creates `dist-tv/` with the Tizen manifest (`tizen/config.xml`) and icon. See [docs/TV-INSTALL.md](docs/TV-INSTALL.md) for Developer Mode, certificates, packaging, and an on-TV checklist.

## TV integration

This app is installed on the TV and is its **Home launcher**: the physical Home button and TV power-on open it, via the native routing in [`../tv-home-control`](../tv-home-control/README.md). Installed apps are read and launched for real, and the Smart Hub tile at the bottom opens Samsung's original UI. Console tiles only show a message; HDMI input switching is not built yet.

## Structure

- `src/App.tsx`: layout, remote navigation, launching, pinning, dialogs
- `src/lib/spatialNav.ts`: TV-remote style arrow navigation
- `src/hooks/useStageScale.ts`: fits the 1920×1080 stage to the window
- `src/hooks/useWeather.ts`: Open-Meteo weather
- `src/components/ChristmasScene.tsx`: original SVG backdrop and snowfall
- `src/data/home.ts`, `src/data/apps.ts`: household, consoles, and app catalog
- `tests/home.spec.ts`: browser tests

## Tests

Tests serve `dist/` on port 7101.

```sh
npm run build
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" npm test
```
