import { describe, it, expect } from "vitest";
import { computeDeltas, expected, movMultiplier, projectedScore } from "@/core/elo";

// Port of eloify/tests/test_elo.py — same fixtures, same invariants.
describe("core/elo primitives", () => {
  it("expected is symmetric", () => {
    expect(expected(1000, 1000)).toBe(0.5);
    expect(expected(1000, 1200) + expected(1200, 1000)).toBeCloseTo(1.0, 10);
  });

  it("deltas are zero-sum", () => {
    const [da, db] = computeDeltas(1000, 1000, 21, 18);
    expect(da).toBeCloseTo(-db, 12);
  });

  it("winner gains, loser loses", () => {
    const [da, db] = computeDeltas(1000, 1000, 21, 10);
    expect(da).toBeGreaterThan(0);
    expect(db).toBeLessThan(0);
  });

  it("bigger margin moves more", () => {
    const [close] = computeDeltas(1000, 1000, 21, 19);
    const [blowout] = computeDeltas(1000, 1000, 21, 3);
    expect(blowout).toBeGreaterThan(close);
  });

  it("even-match blowout is a meaningful swing (10..40 with K=24)", () => {
    const [da] = computeDeltas(1000, 1000, 21, 3);
    expect(da).toBeGreaterThan(10);
    expect(da).toBeLessThan(40);
  });

  it("upset is amplified vs an expected win (same margin)", () => {
    const [underdogWin] = computeDeltas(900, 1100, 21, 15); // weaker A wins
    const [favoriteWin] = computeDeltas(1100, 900, 21, 15); // stronger A wins
    expect(underdogWin).toBeGreaterThan(favoriteWin);
  });

  it("mov multiplier grows with margin", () => {
    expect(movMultiplier(2, 1000, 1000)).toBeLessThan(movMultiplier(18, 1000, 1000));
  });

  it("projected score: favorite reaches target", () => {
    const [fav, dog] = projectedScore(0.65);
    expect(fav).toBe(21);
    expect(dog).toBeGreaterThanOrEqual(0);
    expect(dog).toBeLessThan(fav);
  });

  it("projected score: even match is close (21-19)", () => {
    expect(projectedScore(0.5)).toEqual([21, 19]);
  });

  it("projected score: heavy favorite blows out", () => {
    const [, dog] = projectedScore(0.95);
    expect(dog).toBeLessThanOrEqual(2);
  });

  it("projected score: symmetric around 0.5", () => {
    expect(projectedScore(0.3)).toEqual(projectedScore(0.7));
  });
});
