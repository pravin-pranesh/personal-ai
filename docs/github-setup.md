# GitHub setup — Personal AI Task Store

## Local path (Windows)

| Item | Value |
|------|--------|
| **Folder** | `D:\WORK\la\personal-ai` |
| **Clone URL (HTTPS)** | `https://github.com/pravin-pranesh/personal-ai.git` |
| **Default branch** | `main` |

**Workflow:** GitHub default branch is `main`. Before any work, `git checkout main` and `git pull origin main`; commit and push to `main` only unless you request a feature branch.

## Prerequisites

### Node.js (Expo SDK 58)

- **Recommended:** Node **24 LTS** (e.g. v24.22.x) — best alignment with Expo SDK 58 and React Native 0.88.
- **Also officially supported for this repo:** Node **22.13+**, **25.x**, and **26+** (root `package.json` `engines`).

Check your version:

```powershell
node -v
```

**nvm-windows** (if `nvm` is on PATH):

```powershell
nvm install 24
nvm use 24
cd D:\WORK\la\personal-ai
```

**fnm** (alternative):

```powershell
fnm install 24
fnm use 24
node -v
```

For Node **25**, use `fnm install 25` / `fnm use 25` (or the equivalent with nvm-windows if you maintain a Node 25 install).

After switching Node, from repo root: `npm install`, then `cd apps\mobile`, `npx expo install --fix`, then `npm run typecheck`.

**Note:** Some Metro / React Native nested packages still declare narrower `engines` ranges. On Node 25 you may see **`EBADENGINE`** warnings during `npm install` or when Metro starts. Root `.npmrc` sets `engine-strict=false` so npm does not fail the install; if Metro binds (default **8081**) and the app loads, you can ignore those warnings.

### GitHub CLI

```powershell
gh auth status
# If needed:
gh auth login
```

## Publish (first time from local scaffold)

Run from the repo root in PowerShell (one line):

```powershell
cd D:\WORK\la\personal-ai; gh repo create pravin-pranesh/personal-ai --public --source=. --remote=origin --push --description "Personal AI Task Store — mobile research task marketplace"
```

If `personal-ai` is taken, use `personal-ai-task-store` in the repo name and update `origin` accordingly.

## Clone on another machine

```powershell
cd D:\WORK\la
git clone https://github.com/pravin-pranesh/personal-ai.git personal-ai
cd personal-ai
# Use Node 24 LTS (recommended) or another supported version (see Prerequisites)
npm install
cd apps\mobile
npx expo install --fix
cd ..\..
npm run typecheck
```

## Run API + mobile (desktop)

```powershell
cd D:\WORK\la\personal-ai
npm install

# Terminal 1 — API on :3001 (SQLite via Node built-in, file at server\data\app.db)
npm run server

# Terminal 2 — Expo web
$env:EXPO_PUBLIC_API_URL = "http://localhost:3001"
npm run mobile:web
```

## Run on a phone (Expo Go)

Requires **Expo Go** built for **SDK 58** (matches `apps/mobile` `expo` ~58). Use **Node 24 LTS** (recommended) or another supported Node version before starting Metro.

Use the helper script (starts API + Expo with LAN API URL):

```powershell
cd D:\WORK\la\personal-ai
node -v
.\LOCAL-RUN.ps1
```

Or manually:

1. Allow port **3001** through Windows Firewall for private networks.
2. Find LAN IP: `ipconfig` (Wi‑Fi/Ethernet **IPv4**, e.g. `192.168.1.42`).
3. Terminal 1: `npm run server`
4. Terminal 2:

   ```powershell
   $env:EXPO_PUBLIC_API_URL = "http://192.168.1.42:3001"
   npm run mobile
   ```

5. Scan the QR code in **Expo Go**.

### Android USB debugging (no Wi‑Fi to API)

When the phone cannot reach the laptop’s LAN IP (guest Wi‑Fi, strict firewall), use **adb reverse** on a USB-connected Android device:

1. Enable **USB debugging** on the phone; install [Android platform tools](https://developer.android.com/tools/releases/platform-tools).
2. Terminal 1: `npm run server`
3. Terminal 2:

   ```powershell
   adb reverse tcp:3001 tcp:3001
   adb reverse tcp:8081 tcp:8081
   cd D:\WORK\la\personal-ai
   $env:EXPO_PUBLIC_API_URL = "http://127.0.0.1:3001"
   npx expo start --localhost
   ```

4. Press `a` in the Expo terminal or open Expo Go.

**iPhone:** use Wi‑Fi + LAN IP above, or `npx expo start --tunnel` for the bundle; the API still needs a LAN-reachable `:3001` unless you tunnel the API separately.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run typecheck` | TypeScript for shared, mobile, server |
| `npm run server` | Express API + migrations + catalog seed |
| `npm run mobile` | Expo dev server |
| `npm run mobile:web` | Expo web |
| `.\LOCAL-RUN.ps1` | API + Expo with `EXPO_PUBLIC_API_URL` set to LAN IP |

## Troubleshooting

### Expo Go requires SDK 58 (project was on SDK 52)

Expo Go only loads projects whose **Expo SDK** matches the app. If you see a mismatch error, align `apps/mobile` to SDK 58:

```powershell
cd D:\WORK\la\personal-ai\apps\mobile
npx expo install expo@^58
npx expo install --fix
cd D:\WORK\la\personal-ai
npm install
npm run typecheck
```

Then restart Metro (clear cache if needed: `npx expo start --localhost -c`). Set `EXPO_PUBLIC_API_URL` before starting (see **Run on a phone** above). Prefer **Node 24 LTS** when running these commands; Node 25 is supported but may show harmless `EBADENGINE` warnings from nested deps.

## Notes

- Monorepo: `apps/mobile`, `server`, `packages/shared`.
- Stages 1–3: Home dashboard, Task Store, install/favorites, SQLite catalog.
- Server uses **`node:sqlite`** (no native `better-sqlite3` build on Windows).
