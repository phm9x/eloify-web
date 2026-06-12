// Per-player game history derived by replaying the log — shared by the History
// screen and the inline expansion on the Players board.

import type { Game, PlayerStats } from "@/core/models";
import type { Model } from "@/core/elo";
import { applyGame } from "@/core/engine";

export interface HistoryRow {
  id: number;
  result: "W" | "L";
  mine: number;
  theirs: number;
  opponent: string;
  before: number;
  after: number;
}

/**
 * Replay the whole log, recording the games `player` took part in (optionally
 * only those against `opponent`). Ratings still evolve through every game; the
 * filter only decides which rows are returned. Mirrors the CLI `history`.
 */
export function playerHistory(
  games: Game[],
  player: string,
  model: Model,
  opponent?: string,
): HistoryRow[] {
  const stats = new Map<string, PlayerStats>();
  const rows: HistoryRow[] = [];
  for (const g of games) {
    const before = stats.get(player)?.rating ?? model.startRating;
    applyGame(stats, g, model);
    const onA = g.teamA.includes(player);
    const onB = g.teamB.includes(player);
    if (!onA && !onB) continue;
    const theirTeam = onA ? g.teamB : g.teamA;
    if (opponent && !theirTeam.includes(opponent)) continue;
    const after = stats.get(player)!.rating;
    const mine = onA ? g.scoreA : g.scoreB;
    const theirs = onA ? g.scoreB : g.scoreA;
    rows.push({
      id: g.id,
      result: mine > theirs ? "W" : "L",
      mine,
      theirs,
      opponent: theirTeam.join(" & "),
      before,
      after,
    });
  }
  return rows;
}

/** Rating series for a sparkline: starting rating, then after each recorded game. */
export function trendFromRows(rows: HistoryRow[]): number[] {
  return rows.length ? [rows[0].before, ...rows.map((r) => r.after)] : [];
}
