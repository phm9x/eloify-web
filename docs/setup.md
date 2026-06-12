# One-time setup (Path B: serverless proxy)

The PWA never signs in. A Cloudflare Worker holds a Google **service-account**
key and proxies the Sheets API. This is the one-time wiring.

> 🔐 The service-account JSON key is a secret. Never commit it, never paste it
> into chat. It only ever goes into `wrangler secret put` (entered by you).

## A. Google Cloud (browser, signed in as the dedicated account)

1. **Project** — <https://console.cloud.google.com> → project dropdown (top bar)
   → **New Project** → name it `eloify` → **Create**, then select it.
2. **Enable the Sheets API** — APIs & Services → **Library** → search
   "Google Sheets API" → **Enable**.
   (Direct: <https://console.cloud.google.com/apis/library/sheets.googleapis.com>)
3. **Service account** — APIs & Services → **Credentials** → **Create
   Credentials** → **Service account** → name `eloify-sheets` → **Create and
   continue** → skip the optional roles (access comes from sharing the sheet,
   not project IAM) → **Done**.
4. **JSON key** — Credentials → click the `eloify-sheets` account → **Keys** tab
   → **Add key** → **Create new key** → **JSON** → **Create**. A `.json` file
   downloads. Copy its `client_email` (looks like
   `eloify-sheets@<project>.iam.gserviceaccount.com`).
5. **Share the sheet** — open the Google Sheet → **Share** → paste the
   `client_email` → role **Editor** → uncheck "Notify people" → **Share**.

## B. Sheet identifiers (for the app's Settings + Worker calls)

- **Spreadsheet ID** — from the URL: `…/spreadsheets/d/<THIS>/edit`.
- **Tab gids** — click each tab; the URL ends with `#gid=<number>`.
  - Defaults in our config: Games `gid=0`, Players `gid=604449976` (override in Settings if yours differ).
- **Headers** the app expects (row 1 of each tab):
  - Games: `id, played_at, mode, team_a, team_b, score_a, score_b`
  - Players: `name, created_at`

## C. Cloudflare Worker (we do this together here)

```sh
npx wrangler login                                   # opens browser; authorize
npx wrangler deploy                                  # publishes worker/index.ts
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON  # paste the JSON key contents
# optional gate, must match the Settings "shared token":
npx wrangler secret put SHARED_TOKEN
```

Then set `ALLOWED_ORIGIN` in `wrangler.toml` to the Cloudflare Pages URL once it
exists (use `*` until then), and redeploy.

## D. Point the app at it

In the app's **Settings**: spreadsheet ID, the Worker URL
(`https://eloify.<subdomain>.workers.dev`), the shared token (if set), and the
tab gids. Save → the Board should load real data.
