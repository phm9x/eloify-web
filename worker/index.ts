// Eloify Sheets proxy — Cloudflare Worker (Path B).
//
// Holds the Google service-account key as a secret and talks to the Sheets API
// v4 on the app's behalf, so the PWA never signs in and the key never reaches
// the device. The browser calls these endpoints (see src/data/sheets.ts):
//
//   GET    /api/games?spreadsheetId=…&gid=…    -> { games:   Record[] }
//   GET    /api/players?spreadsheetId=…&gid=…  -> { players: Record[] }
//   POST   /api/games?spreadsheetId=…&gid=…    body { id, mode, team_a, team_b, score_a, score_b }
//   POST   /api/players?spreadsheetId=…&gid=…  body { name }
//   DELETE /api/games/last?spreadsheetId=…&gid=…
//
// Setup (not yet deployed — see worker/README.md):
//   wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON   # the service-account JSON
//   wrangler secret put SHARED_TOKEN                  # optional gate (matches Settings)
//   set ALLOWED_ORIGIN to the Pages URL in wrangler.toml [vars]

interface Env {
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  SHARED_TOKEN?: string;
  ALLOWED_ORIGIN?: string;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

// --- tiny helpers -----------------------------------------------------------

/**
 * CORS headers for a request. ALLOWED_ORIGIN may be "*", a single origin, or a
 * comma-separated allowlist (e.g. the Pages URL + localhost for dev). For a
 * list we echo back the request's Origin if it matches, so multiple origins
 * work without weakening to "*".
 */
function cors(req: Request, env: Env): Record<string, string> {
  const base = {
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    Vary: "Origin",
  };
  const raw = (env.ALLOWED_ORIGIN || "*").trim();
  if (raw === "*") return { ...base, "Access-Control-Allow-Origin": "*" };
  const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get("Origin") ?? "";
  const match = allowed.includes(origin) ? origin : allowed[0];
  return { ...base, "Access-Control-Allow-Origin": match };
}

function json(data: unknown, req: Request, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors(req, env) },
  });
}

function authorized(req: Request, env: Env): boolean {
  if (!env.SHARED_TOKEN) return true;
  return req.headers.get("Authorization") === `Bearer ${env.SHARED_TOKEN}`;
}

// --- service-account access token (RS256 JWT -> OAuth token) ----------------

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";

  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: SCOPE,
        aud: tokenUri,
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const signingInput = `${header}.${claim}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${b64url(sig)}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, exp: now + data.expires_in };
  return data.access_token;
}

async function sheetsFetch(env: Env, path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken(env);
  return fetch(`${SHEETS}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers as object) },
  });
}

// --- sheet helpers ----------------------------------------------------------

/** Resolve a worksheet gid to its A1 title (the values API ranges by title). */
async function titleForGid(env: Env, spreadsheetId: string, gid: number): Promise<string> {
  const res = await sheetsFetch(
    env,
    `/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
  );
  if (!res.ok) throw new Error(`spreadsheets.get failed: ${res.status}`);
  const data = (await res.json()) as {
    sheets: { properties: { sheetId: number; title: string } }[];
  };
  const match = data.sheets.find((s) => s.properties.sheetId === gid);
  if (!match) throw new Error(`no worksheet with gid ${gid}`);
  return match.properties.title;
}

/** Read a tab's grid and shape rows into header-keyed records (like gspread). */
async function readRecords(
  env: Env,
  spreadsheetId: string,
  gid: number,
): Promise<{ title: string; records: Record<string, string>[] }> {
  const title = await titleForGid(env, spreadsheetId, gid);
  const res = await sheetsFetch(env, `/${spreadsheetId}/values/${encodeURIComponent(title)}`);
  if (!res.ok) throw new Error(`values.get failed: ${res.status}`);
  const data = (await res.json()) as { values?: string[][] };
  const rows = data.values ?? [];
  if (rows.length < 2) return { title, records: [] };
  const headers = rows[0];
  const records = rows.slice(1).map((row) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => (rec[h] = row[i] ?? ""));
    return rec;
  });
  return { title, records };
}

async function appendRow(
  env: Env,
  spreadsheetId: string,
  title: string,
  values: (string | number)[],
): Promise<void> {
  const res = await sheetsFetch(
    env,
    `/${spreadsheetId}/values/${encodeURIComponent(title)}:append?valueInputOption=USER_ENTERED`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: [values] }) },
  );
  if (!res.ok) throw new Error(`values.append failed: ${res.status} ${await res.text()}`);
}

// --- request handling -------------------------------------------------------

const GAMES_HEADERS = ["id", "played_at", "mode", "team_a", "team_b", "score_a", "score_b"];

async function handle(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req, env) });
  if (!authorized(req, env)) return json({ error: "unauthorized" }, req, env, 401);

  const url = new URL(req.url);
  const spreadsheetId = url.searchParams.get("spreadsheetId");
  const gid = Number(url.searchParams.get("gid") ?? "0");
  if (!spreadsheetId) return json({ error: "missing spreadsheetId" }, req, env, 400);

  const { pathname } = url;

  if (pathname === "/api/games" && req.method === "GET") {
    const { records } = await readRecords(env, spreadsheetId, gid);
    return json({ games: records }, req, env);
  }

  if (pathname === "/api/players" && req.method === "GET") {
    const { records } = await readRecords(env, spreadsheetId, gid);
    return json({ players: records }, req, env);
  }

  if (pathname === "/api/games" && req.method === "POST") {
    const body = (await req.json()) as Record<string, string | number>;
    const title = await titleForGid(env, spreadsheetId, gid);
    const playedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
    const row = GAMES_HEADERS.map((h) => (h === "played_at" ? playedAt : (body[h] ?? "")));
    await appendRow(env, spreadsheetId, title, row);
    return json({ ok: true }, req, env);
  }

  if (pathname === "/api/players" && req.method === "POST") {
    const body = (await req.json()) as { name: string };
    const title = await titleForGid(env, spreadsheetId, gid);
    const createdAt = new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
    await appendRow(env, spreadsheetId, title, [body.name, createdAt]);
    return json({ ok: true }, req, env);
  }

  if (pathname === "/api/games/last" && req.method === "DELETE") {
    const { title, records } = await readRecords(env, spreadsheetId, gid);
    if (records.length === 0) return json({ ok: true, deleted: false }, req, env);
    void title;
    // deleteDimension is 0-based over the whole grid: header is row 0, so the
    // last data row index == number of data records.
    const lastIndex = records.length;
    const res = await sheetsFetch(env, `/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: { sheetId: gid, dimension: "ROWS", startIndex: lastIndex, endIndex: lastIndex + 1 },
            },
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`batchUpdate failed: ${res.status} ${await res.text()}`);
    return json({ ok: true, deleted: true }, req, env);
  }

  return json({ error: "not found" }, req, env, 404);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      return await handle(req, env);
    } catch (e) {
      return json({ error: String(e instanceof Error ? e.message : e) }, req, env, 500);
    }
  },
};
