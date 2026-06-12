import { describe, it, expect } from "vitest";
import { isLegalScore, validateScore, ScoreError } from "@/core/validate";

// Port of eloify/tests/test_validate.py — identical legal/illegal fixtures.
const LEGAL: [number, number][] = [
  [21, 18], // clean to 21
  [11, 9], // clean to 11
  [12, 10], // 11-game deuce
  [23, 21], // 21-game deuce
  [13, 11], // long 11 deuce
  [11, 0], // shutout
  [17, 15], // 11-game deuce at the cap (6 past target)
  [27, 25], // 21-game deuce at the cap
];

const ILLEGAL: [number, number][] = [
  [11, 10], // won by 1, must deuce
  [21, 20], // won by 1
  [3, 1], // 3 isn't a target
  [4, 2], // target not reached, loser below deuce
  [6, 3], // won by 3, loser below deuce, 6 isn't a target
  [10, 3], // 10 isn't a target; loser below deuce range
  [5, 3], // 5 is not a target
  [7, 5], // 5-game deuce not allowed
  [10, 8], // marathon to-5 deuce not allowed
  [18, 16], // 11-game deuce past the 6-deuce cap (typo)
  [28, 26], // 21-game deuce past the cap (typo)
  [21, 21], // tie
  [-1, 5], // negative
];

describe("core/validate", () => {
  it.each(LEGAL)("accepts legal score %i-%i (order independent)", (a, b) => {
    expect(isLegalScore(a, b)).toBe(true);
    expect(() => validateScore(a, b)).not.toThrow();
    expect(isLegalScore(b, a)).toBe(true);
  });

  it.each(ILLEGAL)("rejects illegal score %i-%i", (a, b) => {
    expect(isLegalScore(a, b)).toBe(false);
    expect(() => validateScore(a, b)).toThrow(ScoreError);
  });
});
