// ELO rating models — a TypeScript port of the Python `elo.py`.
//
// Ratings are always recomputed by replaying the whole game log (see engine.ts),
// so switching the active model never requires a data migration. To add a model,
// write a RateFn and register() it at the bottom of this file.
//
// The margin-of-victory (FiveThirtyEight / World-Football) form:
//   expected_a = 1 / (1 + 10 ** ((R_b - R_a) / 400))
//   mov        = ln(|margin| + 1) * (2.2 / ((R_winner - R_loser) * 0.001 + 2.2))
//   delta_a    = K * mov * (actual_a - expected_a)
// See docs/eloify-features.md for the full reference.

import { START_RATING } from "@/core/models";

export const K = 24.0;
export { START_RATING };

// --- rating primitives ------------------------------------------------------

/** Expected score for A against B (0..1). */
export function expected(ratingA: number, ratingB: number): number {
  return 1.0 / (1.0 + 10 ** ((ratingB - ratingA) / 400.0));
}

/** Margin-of-victory multiplier on the K-factor. */
export function movMultiplier(
  margin: number,
  winnerRating: number,
  loserRating: number,
): number {
  return (
    Math.log(Math.abs(margin) + 1) *
    (2.2 / ((winnerRating - loserRating) * 0.001 + 2.2))
  );
}

/** Python's round(): banker's rounding (half to even), unlike JS Math.round. */
function pyRound(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  // exactly .5 -> round to even
  return floor % 2 === 0 ? floor : floor + 1;
}

/**
 * A plausible final game score to `target` for a given win probability.
 * The favorite reaches `target`; the underdog's points scale with how close
 * the matchup is, capped at `target - 2`. Returns [favoritePoints, underdog].
 */
export function projectedScore(winProb: number, target = 21): [number, number] {
  const fav = Math.max(winProb, 1.0 - winProb);
  const dogPoints = fav > 0 ? pyRound((target * (1.0 - fav)) / fav) : target;
  return [target, Math.min(dogPoints, target - 2)];
}

/**
 * Return [deltaA, deltaB] for the margin-of-victory model (the default math).
 * Kept standalone because it's the model's core and is exercised by tests.
 */
export function computeDeltas(
  teamARating: number,
  teamBRating: number,
  scoreA: number,
  scoreB: number,
  k: number = K,
): [number, number] {
  const expA = expected(teamARating, teamBRating);
  const aWon = scoreA > scoreB;
  const actualA = aWon ? 1.0 : 0.0;
  const [winnerRating, loserRating] = aWon
    ? [teamARating, teamBRating]
    : [teamBRating, teamARating];
  const mov = movMultiplier(Math.abs(scoreA - scoreB), winnerRating, loserRating);
  const deltaA = k * mov * (actualA - expA);
  return [deltaA, -deltaA];
}

// --- the pluggable model abstraction ----------------------------------------

/**
 * One game's inputs from the perspective of the rating math. Ratings and
 * game-counts are per player (parallel to teamA / teamB), so a model can weight
 * teammates differently (e.g. a provisional K that depends on games played).
 */
export interface Matchup {
  teamA: number[]; // current ratings of team A's players
  teamB: number[];
  teamAGames: number[]; // games each team A player has played so far
  teamBGames: number[];
  scoreA: number;
  scoreB: number;
}

export function aWon(m: Matchup): boolean {
  return m.scoreA > m.scoreB;
}

/** A model computes, for one game, the rating delta for each player on each team. */
export type RateFn = (m: Matchup) => [number[], number[]];

export interface Model {
  key: string; // the value passed to the model selector
  label: string; // human-readable name
  description: string; // one-line summary
  rate: RateFn;
  startRating: number;
}

const REGISTRY = new Map<string, Model>();
export const DEFAULT_MODEL = "provisional";

/** Register a model so it's selectable. Throws on a duplicate key. */
export function register(model: Omit<Model, "startRating"> & { startRating?: number }): Model {
  if (REGISTRY.has(model.key)) {
    throw new Error(`Duplicate model key: ${model.key}`);
  }
  const full: Model = { startRating: START_RATING, ...model };
  REGISTRY.set(model.key, full);
  return full;
}

export function defaultModel(): Model {
  return REGISTRY.get(DEFAULT_MODEL)!;
}

/**
 * Every registered model, default first then in registration order. The
 * position here is the model's stable selector number (1-based).
 */
export function allModels(): Model[] {
  const def = defaultModel();
  const rest = [...REGISTRY.values()].filter((m) => m.key !== DEFAULT_MODEL);
  return [def, ...rest];
}

export function modelKeys(): string[] {
  return allModels().map((m) => m.key);
}

/**
 * Look up a model by key or 1-based number; null/undefined yields the default.
 * Throws if the key/number doesn't match a model.
 */
export function getModel(key: string | null | undefined): Model {
  if (key == null) return defaultModel();
  const trimmed = key.trim();
  if (/^\d+$/.test(trimmed)) {
    const models = allModels();
    const idx = parseInt(trimmed, 10);
    if (idx >= 1 && idx <= models.length) return models[idx - 1];
    throw new Error(`Unknown model: ${key}`);
  }
  const model = REGISTRY.get(trimmed);
  if (!model) throw new Error(`Unknown model: ${key}`);
  return model;
}

// --- concrete models --------------------------------------------------------

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Margin-of-victory weighted logistic ELO (the default math). */
function movRate(m: Matchup): [number[], number[]] {
  const [deltaA, deltaB] = computeDeltas(mean(m.teamA), mean(m.teamB), m.scoreA, m.scoreB);
  return [m.teamA.map(() => deltaA), m.teamB.map(() => deltaB)];
}

/** Classic logistic ELO, K=24, margin ignored — a win is a win. */
function plainRate(m: Matchup): [number[], number[]] {
  const expA = expected(mean(m.teamA), mean(m.teamB));
  const actualA = aWon(m) ? 1.0 : 0.0;
  const delta = K * (actualA - expA);
  return [m.teamA.map(() => delta), m.teamB.map(() => -delta)];
}

/** MoV ELO with a higher K (40) for a player's first 10 games, then K=24. */
function provisionalRate(m: Matchup): [number[], number[]] {
  const ra = mean(m.teamA);
  const rb = mean(m.teamB);
  const expA = expected(ra, rb);
  const actualA = aWon(m) ? 1.0 : 0.0;
  const [winner, loser] = aWon(m) ? [ra, rb] : [rb, ra];
  const mov = movMultiplier(Math.abs(m.scoreA - m.scoreB), winner, loser);
  const base = mov * (actualA - expA); // team A's per-K swing; team B is its negative

  const kFor = (games: number) => (games < 10 ? 40.0 : 24.0);
  return [m.teamAGames.map((g) => kFor(g) * base), m.teamBGames.map((g) => -kFor(g) * base)];
}

/** Score-share ELO: outcome is the share of points won, not 1/0. */
function shareRate(m: Matchup): [number[], number[]] {
  const expA = expected(mean(m.teamA), mean(m.teamB));
  const total = m.scoreA + m.scoreB;
  const actualA = total ? m.scoreA / total : 0.5;
  const delta = K * (actualA - expA);
  return [m.teamA.map(() => delta), m.teamB.map(() => -delta)];
}

register({
  key: "mov",
  label: "Margin-of-victory ELO",
  description: "Logistic ELO with the K-factor scaled by score margin.",
  rate: movRate,
});
register({
  key: "elo",
  label: "Plain ELO",
  description: "Classic logistic ELO, K=24 — margin of victory ignored.",
  rate: plainRate,
});
register({
  key: "provisional",
  label: "Provisional-K ELO",
  description: "MoV ELO with K=40 for a player's first 10 games, then K=24 (default).",
  rate: provisionalRate,
});
register({
  key: "share",
  label: "Score-share ELO",
  description: "Outcome = share of points won; a close loss can still gain rating.",
  rate: shareRate,
});
