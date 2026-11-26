# tv-home-control

Native Home/startup routing for "Our Home" (`OurHome001.Home`) on the Samsung
QN75QN60FAFXZC (T-RSLFAKUC-0090-1300.9, Tizen 9.0).

## Credits

This project is an adaptation of other people's work, and wouldn't exist
without it:

- **[CleanFrame](https://github.com/nthnclrk/CleanFrame)** by Nathan Clark
  (MIT) — the direct source of the helper design: the `Control.cs`
  query/apply/restore structure, the drift guards, the readback-verified
  writes, and the SDB staging/callback transport in `run.py`. Our
  `native-home/` is a rename-and-retarget of `scripts/native-home/`.
- **[couchroot](https://github.com/splitcipher/couchroot)** (see
  [`docs/devices/s90d/README.md`](https://github.com/splitcipher/couchroot/blob/main/docs/devices/s90d/README.md))
  — the underlying research on a different Tizen 9.0 model: the discovery that
  the physical Home key resolves `http://tizen.org/appcontrol/operation/main`
  through `app_operation_get_current_app`, that the assignment lives in
  `/opt/dbspace/user/5001/.appsvc.db`, that the `db/appfw/*` vconf keys plus
  Smart Hub `auto_start` make the firmware derive startup/boot IDs to the
  launcher, and that all of it survives reboot.
- **Bishop Fox** — the public `SVE-2025-50109` advisory (Samsung Tizen SDB
  package-name command injection), which is the execution foothold both
  projects use to run the helper as SDK user 901. It is the reason no root
  is needed for the Home routing itself.

Everything here is adapted to our own app identity, model, and firmware; the
compatibility guards in `Control.cs` were kept intact.

## What apply does

- Assigns the `http://tizen.org/appcontrol/operation/main` operation (the
  physical Home key target) to `OurHome001.Home`.
- Sets `db/appfw/home_appid` to `OurHome001.Home`.
- Sets Smart Hub `auto_start` to `1` so the firmware derives startup/boot IDs
  to the launcher.
- Read-before-write with readback verification; auto-restores the snapshot on
  failure. Refuses to run on any other firmware or drifted settings.

## Prerequisites

- The TV on and on the same LAN, with Developer Mode on and this computer
  registered as Host PC (see `../app/docs/TV-INSTALL.md`).
- "Our Home" installed on the TV; the helper refuses to route Home to an app
  that isn't there.
- `sdb` from the Tizen SDK / VS Code Tizen extension. Auto-detected at
  `~/.tizen-extension-platform/server/sdktools/data/tools/sdb` and
  `~/tizen-studio/tools/sdb`, or set `SDB_BIN=/path/to/sdb`.
- Python 3.10+.
- A local .NET 6 SDK (used only to build the helper):

      curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 6.0 --install-dir .local/dotnet

## First run

`.local/` is gitignored, so a fresh clone starts empty:

1. Create `.local/device.json` with the TV's IP and exact model name:

       {"host": "<TV_IP>", "model": "QN75QN60FAFXZC"}

   The model string is what `http://<TV_IP>:8001/api/v2/` reports as
   `device.modelName`; the runner refuses anything else.
2. Build the helper (see **Rebuild** below).
3. `python3 run.py query` — read-only. Save its `OURHOME_JSON=` line as
   `.local/native-home/original.json`. This is the tested rollback baseline;
   never overwrite it after an apply.
4. `python3 run.py apply`, then press the physical Home button to confirm.

## Usage

    python3 run.py query     # read-only; prints current values as OURHOME_JSON=
    python3 run.py apply     # writes routing; needs .local/native-home/original.json
    python3 run.py restore   # exact-value rollback to the snapshot

Installing or updating the app resets the TV's Home routing. After every
`tz install`, run `python3 run.py restore && python3 run.py apply`.

## Recovery notes

- `restore` returns Home to `com.samsung.tv.csfs` and the original typed values.
- Run `restore` before uninstalling "Our Home" or changing its app identity.
- All values live on `/opt`; a TV factory reset also returns everything to stock.
- After a firmware update the firmware guard will refuse to run (fail-closed by
  design): re-check the version string in Control.cs, re-run `query`, and
  refresh the snapshot if settings legitimately changed.

## Layout

- `native-home/` — helper source (Control.cs, csproj, staged shell scripts)
- `run.py` — staging + execution transport (SDB push, one-shot callback)
- `.local/device.json` — TV host IP + model guard
- `.local/dotnet/` — local .NET SDK install (build only)
- `.local/native-home/out/` — compiled helper staged to the TV
- `.local/native-home/original.json` — private rollback snapshot (never commit)

## Rebuild

    .local/dotnet/dotnet build native-home/Control.csproj -c Release \
      -o .local/native-home/out
