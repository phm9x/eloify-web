# Eloify Sheets proxy (Cloudflare Worker — Path B)

Holds the Google service-account key and proxies the Sheets API so the PWA never
signs in and the key never reaches the device. The app (`src/data/sheets.ts`)
calls this Worker; switching to Path A (OAuth) would replace only that file's
transport, not this Worker.

## One-time setup

1. **Dedicated Google account** owns the Sheet and a free Google Cloud project.
2. Create a **service account** in that project; download its JSON key.
3. Share the Sheet with the service account's `client_email` as an **Editor**.
4. Configure the Worker:
   ```sh
   npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON   # paste the JSON key
   npx wrangler secret put SHARED_TOKEN                  # optional gate
   ```
   Set `ALLOWED_ORIGIN` in `wrangler.toml` to the Cloudflare Pages URL once known.

## Run / deploy

```sh
npx wrangler dev      # local, http://localhost:8787
npx wrangler deploy   # publish to <name>.<subdomain>.workers.dev
```

Then in the app's **Settings**, set the Worker URL (and the shared token if used).

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/games?spreadsheetId=&gid=` | All Games rows as header-keyed records |
| GET | `/api/players?spreadsheetId=&gid=` | All Players rows |
| POST | `/api/games?spreadsheetId=&gid=` | Append a game (`played_at` set server-side) |
| POST | `/api/players?spreadsheetId=&gid=` | Append a player |
| DELETE | `/api/games/last?spreadsheetId=&gid=` | Delete the most recent game row |

> Status: scaffolding. Not yet deployed or integration-tested against a real sheet.
