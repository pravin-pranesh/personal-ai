# Personal AI Task Store

Mobile-first app store for AI research tasks — discover, install, and configure tasks that collect public data (Stages 1–3).

## Features

- Home dashboard with a talking animated assistant (Lottie body + heuristic lip-sync mouth shapes; **web** uses the Web Speech API, native uses `expo-speech` — syllable/word timing, not phoneme-perfect)

## Monorepo

| Package | Path |
|---------|------|
| Mobile (Expo) | `apps/mobile` |
| API (Express + SQLite) | `server` |
| Shared types | `packages/shared` |

## Quick start (Windows)

```powershell
cd D:\WORK\la\personal-ai
npm install
npm run typecheck

# Terminal 1 — API on :3001
npm run server

# Terminal 2 — Expo
$env:EXPO_PUBLIC_API_URL = "http://localhost:3001"
npm run mobile
```

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
