# Our Home

A simple Samsung TV home screen with a snowy Christmas background. It shows a recent-app card, pinned apps, connected consoles, weather, and a clock. The **Smart Hub** link at the bottom opens Samsung's original interface.

The physical **Home** button and TV startup can also open Our Home.

## Project layout

- `app/` — the React app that runs on the TV.
- `tv-home-control/` — a small computer-side tool that points Home and startup to the app. It runs once per command; nothing stays running on the TV.

## Run in a browser

```sh
cd app
npm ci
npm run dev -- --host 0.0.0.0 --port 7100
```

Open `http://localhost:7100`.

- Arrow keys or the remote: move around
- Enter or OK: open the selected item
- Number keys 1–9: open a pinned app
- Escape or TV Back: close a dialog or return to the recent-app card

Settings are saved in `localStorage`.

## Change the home screen

- `app/src/data/home.ts` — weather city, temperature units, and consoles. Leave the city empty to hide weather.
- `app/src/data/apps.ts` — app catalog.
- `app/src/lib/tvApps.ts` — installed-app filtering. Add unwanted app IDs to `hiddenAppIds`.

The app detects installed apps and HDMI ports only on the TV. HDMI input switching is not implemented.

## Checks

```sh
cd app
npm run build
npm run lint
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" npm test
```

## Install or update the TV app

First-time Developer Mode, SDK, and certificate setup is in [app/docs/TV-INSTALL.md](app/docs/TV-INSTALL.md). Keep your Samsung certificates private; they are not part of this repo.

For later updates, run from the repo root:

```sh
cd app
npm run build:tv
npm run pack:tv
$SDB connect <TV_IP>
$TZ install -p build-tv/OurHome.wgt
cd ../tv-home-control
python3 run.py restore && python3 run.py apply
```

`SDB` and `TZ` are the tool paths defined in the install guide. The last step is required because installing or updating the app resets the TV's Home routing.

## Set up Home routing for the first time

The helper is currently configured for the model and firmware in `tv-home-control/native-home/Control.cs`. Check these before using another TV or after a firmware update.

You need the TV in Developer Mode with this computer registered as Host PC, the app already installed, Python 3.10+, and `sdb`. The runner checks common SDK locations; otherwise set `SDB_BIN=/path/to/sdb`.

```sh
cd tv-home-control
curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 6.0 --install-dir .local/dotnet
.local/dotnet/dotnet build native-home/Control.csproj -c Release -o .local/native-home/out
```

Create `.local/device.json`:

```json
{"host": "<TV_IP>", "model": "<EXACT_MODEL_NAME>"}
```

The model must match `device.modelName` from `http://<TV_IP>:8001/api/v2/`.

Then:

1. Run `python3 run.py query` and save its `OURHOME_JSON=` value as `.local/native-home/original.json`. Keep this rollback file safe and private.
2. Run `python3 run.py apply` and test the physical Home button.

Useful commands:

```sh
python3 run.py query     # Read current settings
python3 run.py apply     # Point Home and startup to Our Home
python3 run.py restore   # Restore Samsung's original settings
```

Run `restore` before uninstalling the app or changing its app ID. A TV factory reset also restores Samsung's defaults.

## Private and generated files

`.local/`, build output, and signed `*.wgt` packages are gitignored. Do not commit certificates, certificate passwords, TV serial numbers, MAC addresses, or device IDs.

## Credits

Home routing is adapted from [CleanFrame](https://github.com/nthnclrk/CleanFrame) by Nathan Clark (MIT), based on the [couchroot S90D research](https://github.com/splitcipher/couchroot). Its execution method uses the public Bishop Fox `SVE-2025-50109` advisory. Layout inspiration: [arn0-tv](https://github.com/NelsonEU/arn0-tv). See [app/CREDITS.md](app/CREDITS.md) for asset and font credits.
