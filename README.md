# Personal AI Task Store

Mobile-first app store for AI research tasks — discover, install, and configure tasks that collect public data (Stages 1–3).

## Features

- Home dashboard with a talking animated assistant (Lottie body + heuristic lip-sync mouth shapes; **web** uses the Web Speech API, native uses `expo-speech` — syllable/word timing, not phoneme-perfect)
- **Today** tab — daily todos stored in `server/data/daily/todos.json` via `GET/POST/PATCH/DELETE /api/daily/todos`
- **Research** tab — Grok-style chat: type any topic, get a summary plus headline cards; sessions saved as markdown under `server/data/daily/research/` with `index.json` via `GET/POST /api/daily/research` (sample cards until RSS in MA-6)
- **Settings → Delete local data** — `POST /api/daily/reset` clears daily todos and research files only (SQLite task catalog is kept)

## Monorepo

| Package | Path |
|---------|------|
| Mobile (Expo) | `apps/mobile` |
| API (Express + SQLite) | `server` |
| Shared types | `packages/shared` |

## Node.js

- **Recommended:** Node **24 LTS** (best match for Expo SDK 58).
- **Also supported:** Node **22.13+**, **25.x**, and **26+** (see root `package.json` `engines`).
- Metro / React Native nested dependencies may still print **`EBADENGINE`** warnings on Node 25; they are harmless if Metro starts and serves the bundle.

Use **fnm** or **nvm-windows** to switch versions. See [docs/github-setup.md](docs/github-setup.md) for clone, GitHub, and device run steps.

## Quick start (Windows)

```powershell
cd D:\WORK\la\personal-ai
npm install
npm run typecheck

# Terminal 1 — API on :3001
npm run server

# Terminal 2 — Expo (web-first)
$env:EXPO_PUBLIC_API_URL = "http://localhost:3001"
npm run mobile:web
# or: npm run mobile
```

Open the **Today** tab to add, complete, and delete todos. Data persists in `server/data/daily/todos.json` on the machine running the API.

Open the **Research** tab, ask about any news topic, and confirm assistant bubbles plus cards appear; on the laptop, check `server/data/daily/research/*.md` and `index.json` after each prompt.

For phone testing on LAN, use `LOCAL-RUN.ps1`.

## Scripts

- `npm run mobile` — Expo dev server
- `npm run mobile:web` — Expo web
- `npm run server` — REST API (migrates + seeds catalog on first boot)
- `npm run typecheck` — TypeScript for all workspaces

## Troubleshooting (Expo)

Do **not** run bare `npx expo start` from the monorepo root. That starts Expo against the root package (`personal-ai-task-store`) and shows a white screen with only the slug.

Always start mobile from the repo root with:

```powershell
npm run mobile
```

That runs Expo in `apps/mobile` (via `npm --prefix apps/mobile`).
