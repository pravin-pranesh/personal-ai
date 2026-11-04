# Personal AI

Mobile-first **daily assistant** — todos, research chat, and a talking home mascot. The Task Store marketplace has been removed from the mobile UI; the app focuses on day-to-day use.

## Features

- **Home** — welcome dashboard with a talking animated assistant (Lottie body + heuristic lip-sync mouth shapes; **web** uses the Web Speech API, native uses `expo-speech` — syllable/word timing, not phoneme-perfect), shortcuts to Today and Research, and recent research previews
- **Today** tab — daily todos stored in `server/data/daily/todos.json` via `GET/POST/PATCH/DELETE /api/daily/todos`
- **Research** tab — Grok-style chat with **New chat** and **History**: type any topic, get a bullet briefing plus headline cards; threads saved under `server/data/daily/research/` (`index.json` + per-session `{id}.json` and markdown). APIs: `GET/POST /api/daily/research`, `GET /api/daily/research/:id` for replay.
- **Research information sources** (server-side):
  - **Kimi (Moonshot)** — with a valid key and demo stub off: OpenAI-compatible chat completions at `api.moonshot.ai` via `kimiResearch.ts` (shows **Kimi** chip). In **Auto** mode, Kimi is tried before Gemini when both keys are set.
  - **Wikipedia** — when no AI key, demo/offline stub, or AI fails: English Wikipedia REST summary + search (see `server/src/services/wikipediaResearch.ts`). The mobile UI shows a **Wikipedia** chip on the briefing.
  - **Gemini (Google AI Studio)** — with a valid key and demo stub off: grounded, web-style JSON briefing via `geminiResearch.ts` (shows **Gemini** chip). On failure, falls back to Wikipedia then sample **Demo** cards.
  - **Demo / stub** — sample headline cards when Wikipedia has no match (`sourcesUsed` includes **Demo**).
- **Settings** — save **Gemini** and/or **Kimi** API keys on the server (`PUT /api/settings`, stored in gitignored `server/data/settings.json`) or set environment variables on the API process:
  - Gemini: `GEMINI_API_KEY` or `GOOGLE_API_KEY`
  - Kimi: `MOONSHOT_API_KEY` or `KIMI_API_KEY`
  - Optional `researchProvider`: `auto` (default), `kimi`, `gemini`, or `wikipedia`
  - Research **Auto** order: Kimi → Gemini → Wikipedia → demo. **Delete local data** — `POST /api/daily/reset` clears daily todos and research files only (SQLite task catalog on the server is unchanged)

### Kimi API key (Moonshot)

1. Sign in at [platform.kimi.ai](https://platform.kimi.ai).
2. Open **Console → API Keys** and create a key (pay-as-you-go billing; flagship models such as `kimi-k3.1-pro` require a minimum top-up, typically about **$1 USD** — not free unlimited).
3. In the app **Settings → Kimi (Moonshot)**, paste the key and tap **Save**, then **Test connection** (`GET /api/settings/test-kimi`).
4. Or set `MOONSHOT_API_KEY` / `KIMI_API_KEY` in the server environment before starting `npm run server`.

### Legacy server APIs

The Express server still exposes `/tasks`, `/installed`, and `/dashboard` catalog endpoints (SQLite-backed) for backward compatibility. The mobile app no longer calls them except `/dashboard` for welcome text and recent research snippets.

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

Open the **Research** tab, ask about any news topic (e.g. “lion”), and confirm source chips (**Wikipedia** in demo/no-key mode), assistant bubbles, and cards. Tap **History** to reopen a saved thread; **New chat** clears the composer. On the laptop, check `server/data/daily/research/index.json`, `{session-id}.json`, and `*.md` after each prompt.

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
