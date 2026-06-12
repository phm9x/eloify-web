# Eloify iPad PWA (client-side rewrite)

## Goal & constraints
A version of eloify that:
- runs on an iPad with a nice, touch-friendly UI,
- still talks to the same Google Sheet (single source of truth, shared with the CLI),
- costs nothing,
- does **not** require a laptop to be on or on the same network.

The only way to satisfy all four is a **client-side PWA**: all logic runs as JS in
Safari on the iPad; the app's static files are served from a free CDN; the browser
talks **directly** to the Google Sheets API. No compute server exists anywhere — the
only moving parts are the iPad, a free static host (CDN), and Google.

**New repo.** This is a TypeScript rewrite sharing *zero* code with the Python CLI —
it lives in its own repo (e.g. `eloify-web`), not in `eloify/`. The two stay in sync
through the shared Google Sheet (the data), not through shared code.

**Decisions (confirmed):** React + Vite + Tailwind; free static hosting (Cloudflare
Pages). This is a full rewrite of the presentation + data layer in TypeScript.

**Usage model:** a **shared office iPad** used by trusted coworkers, run as a locked
kiosk (see *iPad kiosk & security* below). The device passcode stays private to you.

**Google account & data ownership.** A **dedicated Google account** (created just for
this) owns the Google Sheet *and* the Google Cloud project behind whichever auth path we
pick (OAuth client or service account). Nothing rides on a personal account: ownership can
be handed off, the API credentials are isolated from anyone's personal Gmail/Drive, and no
personal identity is ever signed in on the shared kiosk. The Sheet is shared out to whoever
needs CLI/edit access; the account itself stays locked down (keep its recovery info durable).

**Auth — deferred (two paths).** Because the device is a shared, mostly-unattended
kiosk, the two options trade off differently:
- *OAuth (sign in as the dedicated account):* no backend, but tokens expire (~1h;
  testing-mode consent can lapse after ~7 days idle) → someone would eventually have to
  re-enter the dedicated account's Google login on the shared device. Bad fit for unattended.
- *Serverless proxy (recommended for kiosk):* service-account key hidden in a free
  Cloudflare Worker; the app calls the Worker, **never signs in**. Always-on, no
  expiry, secret never on the device. Reintroduces a free, not-your-laptop backend.
Pick when building; the data layer is written so only `data/sheets.ts`'s transport
changes between the two.

## Auth — the one real architectural shift (two candidate paths)
The CLI authenticates with a **service-account JSON key**, which cannot ship in a
client-side app (view-source would leak it). Two ways to fix this:

### Path A — OAuth (Google Identity Services), sign in as the dedicated account
- `google.accounts.oauth2.initTokenClient` requests an access token with scope
  `https://www.googleapis.com/auth/spreadsheets` (read + write). Token ~1h, in memory.
- Web-application OAuth client ID in the dedicated account's free Google Cloud project;
  authorized JS origins = Cloudflare Pages URL + `http://localhost:5173` (dev).
- Consent screen in **Testing** mode with the dedicated account as a test user.
- **Downside for kiosk:** token/consent expiry → periodic re-login *as the dedicated
  account* on the shared iPad. Awkward for an unattended device.

### Path B — serverless proxy (recommended for the shared kiosk)
- A service account in the dedicated account's Google Cloud project; its key lives as a
  secret in a **free Cloudflare Worker** (or Pages Function). The PWA calls the Worker
  (`/api/games`, `/api/append`, …); the Worker uses the service account to hit Sheets. Key
  never reaches the device; **no sign-in ever**.
- Optionally gate the Worker with a simple shared token baked into the deployed app so
  only your app can call it. Still free, still always-on, still not your laptop.

`data/sheets.ts` is written so only its transport (direct Sheets calls vs. Worker calls)
differs between A and B — the rest of the app is identical. Decide at build time.

## Architecture (`src/`)
```
src/
  auth/google.ts        # GIS token client; getAccessToken(), ensureSignedIn()
  data/sheets.ts        # Sheets API v4 client (port of sheets.Store)
  core/
    models.ts           # Game, PlayerStats types
    elo.ts              # pluggable rating models (incl. provisional K=40 first 10 games)
    engine.ts           # replay → stats, leaderboard, modes, rating_trend, preview, match
    validate.ts         # validate_score
  ui/
    App.tsx, routes     # Board, Players, History, Odds, Last, LogGame, Models, Settings
    components/         # LeaderboardTable, Headshot, Sparkline, GameForm, ModelPicker
  pwa/
    manifest, icons, service worker (via vite-plugin-pwa)
```

### data/sheets.ts — Sheets API v4 (port of `sheets.Store`)
- read games: `GET /v4/spreadsheets/{id}/values/{range}`
- log game: `POST .../values/{range}:append?valueInputOption=USER_ENTERED`
- add player / headers: `append` / `update`
- undo last: `batchUpdate` deleteDimension on the last row (mirror `delete_last_game`)
- `next_game_id`, `player_names` derived from the read, same as the Store.
- Spreadsheet ID lives in a **Settings** screen (persisted to `localStorage`), not baked in.

### core/* — direct port of the Python core
- `elo.ts`: models registry (`getModel`, `allModels`), `expected`, `projectedScore`;
  provisional model = K=40 for a player's first 10 games, then standard K.
- `engine.ts`: `replay`, `replayModes` (overall/singles/doubles), `leaderboard`,
  `applyGame`, `previewGame`, `ratingTrend`, `matchCandidates`, `recordToGame`.
- `validate.ts`: `validateScore`. `models.ts`: `Game`, `PlayerStats`.
- Port `tests/` for the core to **Vitest** — these are pure functions, easy to verify.

### ui/* — React + Tailwind, mobile-first
- **Board**: leaderboard with overall/singles/doubles toggle + model selector (remembered
  in `localStorage`), top-N.
- **History**: player (+ optional opponent) with an SVG sparkline of rating over time.
- **Odds**: p1 vs p2 → expected score + projected delta.
- **Last N**, **Models**, **Players**.
- **Log Game**: 1v1/2v2 toggle, player fields backed by a `<datalist>` of names (free text
  → new player), **live projected-delta preview** from `engine.previewGame`, submit →
  `append` → invalidate cache → refresh.
- **Headshots**: render the committed braille via `<pre class="font-mono leading-none">`;
  placeholder when none. (Setting a headshot stays CLI-only — needs Pillow/chafa + commits.)
- **Sparkline**: tiny custom SVG polyline component (no heavy chart lib).

### Caching
- In-memory snapshot of games + player names with short TTL (~20s); invalidate on write.
- Optionally cache the last board read in `localStorage` so the app shows *something*
  offline (the app shell is already cached by the service worker).

## PWA & hosting
- `vite-plugin-pwa`: web manifest (name, standalone display, theme color, icons),
  service worker precaching the app shell. Add `apple-touch-icon` + `<meta name=
  "apple-mobile-web-app-capable" content="yes">` so Add-to-Home-Screen looks native.
- **Cloudflare Pages** (free): connect the GitHub repo, build `vite build`, deploy on push.
  Gives an always-on HTTPS URL on a CDN — this is what removes the laptop dependency.
  Add that URL to the OAuth client's authorized origins.
- iPad: open the URL in Safari → Share → **Add to Home Screen** → app icon, full-screen.

## Install & updates
**Install (one-time).** No App Store, no profile, no cable — "install" is just a home-screen
bookmark. Open the Pages URL in **Safari** (required; Chrome on iOS can't install PWAs) →
Share → **Add to Home Screen** → full-screen icon. The `apple-touch-icon` +
`apple-mobile-web-app-capable` meta tags (above) make it look native, not bookmark-y.

**Updates are automatic, in two stages:**
- *Commit → deploy (~1 min, hands-off):* Cloudflare Pages watches the repo; every push to
  the deploy branch runs `vite build` and publishes to the CDN. The live URL now serves the
  new build.
- *Deployed → running on the iPad:* use `vite-plugin-pwa` with `registerType: 'autoUpdate'`
  so the service worker activates the new version and reloads as soon as it's downloaded —
  best fit for an unattended kiosk (push a commit, the iPad picks it up untouched). The
  alternative, a prompt-to-update toast, needs a human tap and is a poor fit here.

**iOS caveat (matters for the always-on kiosk):** iOS only checks for updates when the app is
**launched or brought to foreground**, not while it sits idle on screen. On a kiosk that
never closes, the practical trigger is a reload/interaction. So "commit and it's live seconds
later, untouched" isn't guaranteed — "live the next time anyone opens or interacts with it"
is. If we want true unattended refresh, add a periodic "check-for-update + reload" timer in
code. (Storage eviction is the inverse case: iOS may drop unused PWA storage after weeks; the
app just re-fetches from Sheets on next load — see *iOS-specific caveats* below.)

## iPad kiosk & security (shared office device)
The iPad is shared with trusted coworkers, but the **device passcode stays private to
you** and people should never reach Settings, your email, or other apps. Use iOS
**Guided Access** — no wiping, no removing the passcode:
- Settings → Accessibility → **Guided Access** on; set a Guided Access passcode **only you
  know** (separate from the device passcode).
- Open the eloify PWA, triple-click the side button to **start Guided Access** → the iPad
  is locked to the app. Coworkers use it freely but can't exit without your passcode.
- Settings → Display & Brightness → **Auto-Lock → Never**; keep it on a charger so it
  stays awake and the app stays up.
- Caveat: after a full **reboot** (dead battery, iOS update) the device passcode is
  required once before Guided Access resumes — keep it plugged in; re-arm on rare reboots.
- This is also why **Path B (serverless proxy)** is attractive: an unattended kiosk that
  periodically demands the dedicated account's Google re-login (Path A) is a recurring annoyance.

## iOS-specific caveats to handle
- **OAuth popups in standalone PWA**: GIS opens a popup; in home-screen standalone mode
  popups can be flaky. Prefer the GIS token flow and, if needed, fall back to a redirect
  flow; test the signed-in path from the installed PWA, not just Safari tabs.
- **Service-worker storage eviction**: iOS may evict unused PWA storage after weeks;
  the app re-fetches from Sheets on next load, so this only affects offline cache.
- **Sheets API quota**: free tier is generous for single-user; the TTL cache keeps us
  well under it.

## Build order (focused commits)
1. Vite + React + Tailwind scaffold; Settings screen (spreadsheet ID); GIS auth + sign-in.
2. `data/sheets.ts` Sheets v4 client (read path) + `core/*` port + Vitest for core.
3. Board + History + Odds + Last + Models read UI; headshots; sparkline.
4. Log Game write flow (preview, append, undo, add-player); cache invalidation.
5. PWA manifest/SW/icons; Cloudflare Pages deploy + OAuth origin config; README.

## Verification
- **Vitest**: core port matches Python results on the same fixtures (replay, leaderboard,
  provisional K, odds, validation).
- **Local**: `npm run dev`, sign in, read board from the real sheet, log a 1v1, undo.
- **Deployed**: open the Pages URL on the iPad, Add to Home Screen, repeat the smoke test
  on cellular (no laptop, off-network) to confirm the constraint is met.
