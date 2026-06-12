// Shared data structures — a TypeScript port of the Python `models.py`.
// See docs/eloify-features.md for the full behavior reference.

export const START_RATING = 1000.0;

export type Mode = "1v1" | "2v2";

export interface Game {
  id: number;
  playedAt: string; // ISO-8601 UTC, seconds precision
  mode: Mode;
  teamA: string[];
  teamB: string[];
  scoreA: number;
  scoreB: number;
}

export interface PlayerStats {
  name: string;
  rating: number;
  wins: number;
  losses: number;
  games: number;
}

export function newPlayerStats(name: string, rating = START_RATING): PlayerStats {
  return { name, rating, wins: 0, losses: 0, games: 0 };
}

export function winner(game: Game): string[] {
  return game.scoreA > game.scoreB ? game.teamA : game.teamB;
}

export function winPct(s: PlayerStats): number {
  return s.games ? (s.wins / s.games) * 100 : 0;
}
