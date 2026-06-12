import { describe, it, expect } from "vitest";
import { START_RATING, newPlayerStats, winner, winPct, type Game } from "@/core/models";

// Smoke test — confirms the Vitest harness is wired up ahead of the full
// core port (step 2), which will compare against the Python fixtures.
describe("core/models", () => {
  it("starts players at 1000", () => {
    expect(newPlayerStats("peter").rating).toBe(START_RATING);
  });

  it("derives the winner from the higher score", () => {
    const game: Game = {
      id: 1,
      playedAt: "",
      mode: "1v1",
      teamA: ["peter"],
      teamB: ["duncan"],
      scoreA: 21,
      scoreB: 18,
    };
    expect(winner(game)).toEqual(["peter"]);
  });

  it("computes win percentage, guarding divide-by-zero", () => {
    expect(winPct({ name: "x", rating: 1000, wins: 0, losses: 0, games: 0 })).toBe(0);
    expect(winPct({ name: "x", rating: 1000, wins: 3, losses: 1, games: 4 })).toBe(75);
  });
});
