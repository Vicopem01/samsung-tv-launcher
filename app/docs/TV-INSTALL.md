# Installing "Our Home" on the Samsung TV

For a 2025 Samsung TV (Tizen 9.0) and a Mac on the same network. Menu names can vary slightly by firmware.

The Tizen tools used here come with the Tizen SDK / VS Code Tizen extension and live in a hidden folder:

```sh
SDB=~/.tizen-extension-platform/server/sdktools/data/tools/sdb
TZ=~/.tizen-extension-platform/server/sdktools/data/tools/tizen-core/tz
```

## Every update (after the one-time setup below)

```sh
cd app
npm run build:tv     # build into dist-tv/
npm run pack:tv      # zip + sign with the active Samsung profile → build-tv/OurHome.wgt
$SDB connect <TV_IP> # your TV's LAN IP (also kept in tv-home-control/.local/device.json)
$TZ install -p build-tv/OurHome.wgt
# Re-assign Home — installing/updating the app resets the TV's Home routing:
cd ../tv-home-control && python3 run.py restore && python3 run.py apply
```

If more than one device is connected, add `-t <name>` (from `$SDB devices`) to the install command. To sign with a profile other than the active one: `TIZEN_PROFILE=<name> npm run pack:tv`. Pins and settings on the TV are kept between updates.

## One-time setup

### 1. Tizen SDK
Install the Tizen SDK, then in **Package Manager → Advanced SDK Installation** install **10.0 TV**.

### 2. Developer Mode on the TV
1. Note the Mac's IP: **System Settings → Wi-Fi → Details**.
2. On the TV, open the full **Apps** page.
3. Enter **1 2 3 4 5**. The SolarCell remote has no number keys; the number pad in the SmartThings phone app is the most reliable way to enter them.
4. Turn **Developer mode** on, enter the Mac's IP, then fully restart the TV.

### 3. Connect
Use the VS Code Tizen extension's device manager, or run `$SDB connect <TV-IP>`.

### 4. Samsung certificate
In VS Code: **Tizen: Certificate Manager** → new **Samsung** → **TV** profile, with the TV connected so its DUID is included. Check it with `$TZ security-profiles list`. Keep the certificate files and password private, and use the same certificate for every update.

## Check on the TV

- [ ] "Our Home" appears in Apps. Move it to the start of the home bar so **Home → OK** opens it.
- [ ] Opens to the big recent-app card with focus on it
- [ ] Installed apps appear with brand tiles; apps that aren't installed are absent
- [ ] All apps lists other installed apps without system clutter (add clutter IDs to `hiddenAppIds` in `src/lib/tvApps.ts`)
- [ ] Selecting a tile opens the real app; the big card then shows that app
- [ ] Number keys 1–9 (SmartThings keypad) open apps; Back returns to the big card and closes dialogs
- [ ] Consoles: only connected ports appear; check a console that is off but plugged in
- [ ] Weather appears once `weatherCity` is set in `src/data/home.ts`
- [ ] Text is comfortable to read from the couch

## If something goes wrong

- **Connect fails:** the Developer mode IP must match the Mac's current IP; restart the TV after changing it.
- **Install refused (signature/certificate):** the certificate must include this TV's DUID. Recreate it with the TV connected.
- **Blank screen:** tell the AI Agent. Remote inspection of the app shows the error.
- **Remove the app:** in Apps, select it → Delete, or turn Developer mode off.
