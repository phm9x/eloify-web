// Rating engine — a TypeScript port of the Python `engine.py`.
//
// Ratings are always recomputed from the full chronological game log rather
// than stored mutably, so the model can change freely and a corrected or
// deleted game just changes the replay. Every entry point takes an optional
// model; omitting it uses the registered default.

import type { Game, PlayerStats } from "@/core/models";
import { newPlayerStats } from "@/core/models";
import type { Matchup, Model } from "@/core/elo";
import { defaultModel } from "@/core/elo";

function ensure(stats: Map<string, PlayerStats>, name: string, model: Model): PlayerStats {
  let s = stats.get(name);
  if (!s) {
    s = newPlayerStats(name, model.startRating);
    stats.set(name, s);
  }
  return s;
}

function buildMatchup(stats: Map<string, PlayerStats>, game: Game, model: Model): Matchup {
  const rating = (n: string) => stats.get(n)?.rating ?? model.startRating;
  const games = (n: string) => stats.get(n)?.games ?? 0;
  return {
    teamA: game.teamA.map(rating),
    teamB: game.teamB.map(rating),
    teamAGames: game.teamA.map(games),
    teamBGames: game.teamB.map(games),
    scoreA: game.scoreA,
    scoreB: game.scoreB,
  };
}

/**
 * Apply one game's rating + W/L updates to `stats` in place.
 * Returns name -> delta for the players involved.
 */
export function applyGame(
  stats: Map<string, PlayerStats>,
  game: Game,
  model: Model,
): Record<string, number> {
  const [deltasA, deltasB] = model.rate(buildMatchup(stats, game, model));
  const aWon = game.scoreA > game.scoreB;
  const out: Record<string, number> = {};
  game.teamA.forEach((n, i) => {
    const s = ensure(stats, n, model);
    s.rating += deltasA[i];
    s.games += 1;
    s.wins += aWon ? 1 : 0;
    s.losses += aWon ? 0 : 1;
    out[n] = deltasA[i];
  });
  game.teamB.forEach((n, i) => {
    const s = ensure(stats, n, model);
    s.rating += deltasB[i];
    s.games += 1;
    s.wins += aWon ? 0 : 1;
    s.losses += aWon ? 1 : 0;
    out[n] = deltasB[i];
  });
  return out;
}

/** Replay games in order; return name -> PlayerStats with final ratings. */
export function replay(
  playerNames: string[],
  games: Game[],
  model: Model = defaultModel(),
): Map<string, PlayerStats> {
  const stats = new Map<string, PlayerStats>();
  for (const n of playerNames) stats.set(n, newPlayerStats(n, model.startRating));
  for (const game of games) applyGame(stats, game, model);
  return stats;
}

export interface ModeStats {
  overall: Map<string, PlayerStats>;
  singles: Map<string, PlayerStats>;
  doubles: Map<string, PlayerStats>;
}

/**
 * Derive overall / singles / doubles ratings from one game log. Same rows,
 * three filters — each is an independent replay, so a player's singles rating
 * is unaffected by their doubles games and vice versa.
 */
export function replayModes(
  playerNames: string[],
  games: Game[],
  model: Model = defaultModel(),
): ModeStats {
  return {
    overall: replay(playerNames, games, model),
    singles: replay(playerNames, games.filter((g) => g.mode === "1v1"), model),
    doubles: replay(playerNames, games.filter((g) => g.mode === "2v2"), model),
  };
}

/** Sort by rating desc, then games desc, then name (case-insensitive) asc. */
export function leaderboard(stats: Map<string, PlayerStats>): PlayerStats[] {
  return [...stats.values()].sort((a, b) => {
    if (a.rating !== b.rating) return b.rating - a.rating;
    if (a.games !== b.games) return b.games - a.games;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

export interface Projection {
  before: number;
  after: number;
  delta: number;
}

/** Return name -> {before, after, delta} for a prospective (unsaved) game. */
export function previewGame(
  stats: Map<string, PlayerStats>,
  teamA: string[],
  teamB: string[],
  scoreA: number,
  scoreB: number,
  model: Model = defaultModel(),
): Record<string, Projection> {
  const game: Game = { id: 0, playedAt: "", mode: "1v1", teamA, teamB, scoreA, scoreB };
  const [deltasA, deltasB] = model.rate(buildMatchup(stats, game, model));
  const out: Record<string, Projection> = {};
  const record = (names: string[], deltas: number[]) =>
    names.forEach((n, i) => {
      const before = stats.get(n)?.rating ?? model.startRating;
      out[n] = { before, after: before + deltas[i], delta: deltas[i] };
    });
  record(teamA, deltasA);
  record(teamB, deltasB);
  return out;
}

/**
 * The player's ELO over time: their rating going in, then after each game they
 * played (optionally only games against `opponent`). Ratings still evolve
 * through every game in the log — `opponent` only filters which points are
 * recorded. Returns [] if the player hasn't played a matching game.
 */
export function ratingTrend(
  games: Game[],
  player: string,
  model: Model = defaultModel(),
  opponent?: string,
): number[] {
  const stats = new Map<string, PlayerStats>();
  const points: number[] = [];
  for (const game of games) {
    const before = stats.get(player)?.rating ?? model.startRating;
    applyGame(stats, game, model);
    if (!game.teamA.includes(player) && !game.teamB.includes(player)) continue;
    const theirTeam = game.teamA.includes(player) ? game.teamB : game.teamA;
    if (opponent && !theirTeam.includes(opponent)) continue;
    if (points.length === 0) points.push(before);
    points.push(stats.get(player)!.rating);
  }
  return points;
}

/** Fuzzy-match a typed token to known player names (exact > prefix > substr). */
export function matchCandidates(token: string, known: string[]): string[] {
  const tl = token.toLowerCase();
  const predicates: ((n: string) => boolean)[] = [
    (n) => n.toLowerCase() === tl,
    (n) => n.toLowerCase().startsWith(tl),
    (n) => n.toLowerCase().includes(tl),
  ];
  for (const predicate of predicates) {
    const hits = known.filter(predicate);
    if (hits.length) return hits;
  }
  return [];
}
