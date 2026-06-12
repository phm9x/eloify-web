// Hard validation of ping pong scores — a TypeScript port of `validate.py`.
//
// A game is played to a target of 11 or 21 and must be won by 2 (deuce extends
// play past the target). Deuce is capped at MAX_DEUCES points past the target.
// A result (w, l) with w > l is legal if SOME target T in {11, 21} satisfies:
//   clean win:  w == T  and  l <= T - 2
//   deuce:      w == l + 2  and  l >= T - 1  and  w <= T + MAX_DEUCES
// So the largest legal results are 17-15 (to 11) and 27-25 (to 21).

export const TARGETS = [11, 21] as const;
export const MAX_DEUCES = 6;

export class ScoreError extends Error {}

function validForTarget(winner: number, loser: number, target: number): boolean {
  if (winner === target && loser <= target - 2) return true;
  if (winner === loser + 2 && loser >= target - 1 && winner <= target + MAX_DEUCES) {
    return true;
  }
  return false;
}

export function isLegalScore(scoreA: number, scoreB: number): boolean {
  if (scoreA < 0 || scoreB < 0 || scoreA === scoreB) return false;
  const winner = Math.max(scoreA, scoreB);
  const loser = Math.min(scoreA, scoreB);
  return TARGETS.some((t) => validForTarget(winner, loser, t));
}

/** Throw a ScoreError if (scoreA, scoreB) isn't a legal result. */
export function validateScore(scoreA: number, scoreB: number): void {
  if (scoreA < 0 || scoreB < 0) {
    throw new ScoreError("Scores can't be negative.");
  }
  if (scoreA === scoreB) {
    throw new ScoreError("Ping pong has no ties — the scores must differ.");
  }
  if (!isLegalScore(scoreA, scoreB)) {
    const winner = Math.max(scoreA, scoreB);
    const loser = Math.min(scoreA, scoreB);
    throw new ScoreError(
      `${winner}-${loser} isn't a legal result. Games go to 11 or 21, ` +
        "won by 2 (deuce caps at 17-15 / 27-25).",
    );
  }
}
