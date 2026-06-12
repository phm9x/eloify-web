// Sheets data layer — the single transport seam between the two auth paths.
//
// The app is built for Path B (serverless proxy): every call goes to a free
// Cloudflare Worker that holds the service-account key and talks to the Google
// Sheets API on our behalf. The browser never sees a credential and never signs
// in. To switch to Path A (OAuth/GIS, direct Sheets calls), only the `request`
// transport below changes — the Store's shape and the rest of the app stay put.
//
// Mirrors the Python `sheets.Store`: read games/players, append a game, add a
// player, undo the last game. Row→domain shaping (splitting "a, b" team cells,
// parsing ints) lives here so core/engine can stay pure over Game[].

import type { AppConfig } from "@/data/config";
import { isConfigured } from "@/data/config";
import type { Game, Mode } from "@/core/models";

export class SheetsError extends Error {}

// Raw row as the Worker returns it (objects keyed by the sheet's headers).
interface GameRecord {
  id: string | number;
  played_at: string;
  mode: string;
  team_a: string;
  team_b: string;
  score_a: string | number;
  score_b: string | number;
}

interface PlayerRecord {
  name: string;
  created_at?: string;
}

function splitTeam(cell: string): string[] {
  return String(cell)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Normalize a user-entered Worker URL: trim, add https:// if no scheme, drop
 *  trailing slash. Forgives "eloify.example.workers.dev" → full https URL. */
export function normalizeBaseUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, "");
  if (u && !/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

function recordToGame(rec: GameRecord): Game {
  return {
    id: Number(rec.id),
    playedAt: String(rec.played_at),
    mode: String(rec.mode) as Mode,
    teamA: splitTeam(rec.team_a),
    teamB: splitTeam(rec.team_b),
    scoreA: Number(rec.score_a),
    scoreB: Number(rec.score_b),
  };
}

// --- transport (Path B) -----------------------------------------------------
// The ONLY part that differs between auth paths. Everything below uses request().

async function request<T>(
  config: AppConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!isConfigured(config)) {
    throw new SheetsError(
      "Not configured. Set the spreadsheet ID and Worker URL in Settings.",
    );
  }
  const base = normalizeBaseUrl(config.workerBaseUrl);
  let url: URL;
  try {
    url = new URL(base + path);
  } catch {
    throw new SheetsError(`Worker URL looks invalid: "${config.workerBaseUrl}".`);
  }
  url.searchParams.set("spreadsheetId", config.spreadsheetId);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (config.sharedToken) headers["Authorization"] = `Bearer ${config.sharedToken}`;

  let res: Response;
  try {
    res = await fetch(url.toString(), { ...init, headers });
  } catch (e) {
    throw new SheetsError(`Couldn't reach the Worker at ${base}: ${String(e)}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SheetsError(
      `Worker error ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
  return (await res.json()) as T;
}

// --- store ------------------------------------------------------------------

export class Store {
  private readonly config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  async readGames(): Promise<Game[]> {
    const { games } = await request<{ games: GameRecord[] }>(
      this.config,
      `/api/games?gid=${this.config.gamesGid}`,
    );
    return games.map(recordToGame);
  }

  async playerNames(): Promise<string[]> {
    const { players } = await request<{ players: PlayerRecord[] }>(
      this.config,
      `/api/players?gid=${this.config.playersGid}`,
    );
    return players.map((p) => String(p.name).trim()).filter(Boolean);
  }

  /** Next id = max existing + 1 (1 if empty); mirrors Store.next_game_id. */
  static nextGameId(games: Game[]): number {
    const ids = games.map((g) => g.id).filter((n) => Number.isInteger(n));
    return ids.length ? Math.max(...ids) + 1 : 1;
  }

  async appendGame(game: Omit<Game, "playedAt">): Promise<void> {
    await request(this.config, `/api/games?gid=${this.config.gamesGid}`, {
      method: "POST",
      body: JSON.stringify({
        id: game.id,
        mode: game.mode,
        team_a: game.teamA.join(", "),
        team_b: game.teamB.join(", "),
        score_a: game.scoreA,
        score_b: game.scoreB,
      }),
    });
  }

  async addPlayer(name: string): Promise<void> {
    await request(this.config, `/api/players?gid=${this.config.playersGid}`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async deleteLastGame(): Promise<void> {
    await request(this.config, `/api/games/last?gid=${this.config.gamesGid}`, {
      method: "DELETE",
    });
  }

  async deleteGame(id: number): Promise<void> {
    await request(this.config, `/api/games?gid=${this.config.gamesGid}&id=${id}`, {
      method: "DELETE",
    });
  }
}
