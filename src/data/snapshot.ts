// In-memory snapshot of the sheet (games + player names) with a short TTL.
//
// Reads are cheap and the sheet changes rarely, so we cache the last read for
// ~20s keyed by the active config and invalidate on every write. This keeps us
// well under the Sheets API quota and makes navigation between read screens
// instant. The service worker (step 5) caches the app shell; this caches data.

import { Store } from "@/data/sheets";
import type { AppConfig } from "@/data/config";
import type { Game } from "@/core/models";

export interface Snapshot {
  games: Game[];
  players: string[];
}

const TTL_MS = 20_000;

function cacheKey(c: AppConfig): string {
  return [c.workerBaseUrl, c.spreadsheetId, c.gamesGid, c.playersGid].join("|");
}

let cached: { key: string; at: number; data: Snapshot } | null = null;

export async function getSnapshot(
  config: AppConfig,
  opts: { force?: boolean } = {},
): Promise<Snapshot> {
  const key = cacheKey(config);
  const now = Date.now();
  if (!opts.force && cached && cached.key === key && now - cached.at < TTL_MS) {
    return cached.data;
  }
  const store = new Store(config);
  const [games, players] = await Promise.all([store.readGames(), store.playerNames()]);
  const data: Snapshot = { games, players };
  cached = { key, at: now, data };
  return data;
}

/** Drop the cache so the next read hits the sheet (call after any write). */
export function invalidateSnapshot(): void {
  cached = null;
}
