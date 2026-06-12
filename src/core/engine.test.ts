import { describe, it, expect } from "vitest";
import type { Game, Mode } from "@/core/models";
import { ratingTrend, replayModes } from "@/core/engine";

// Port of eloify/tests/test_engine.py — same fixtures.
function g(id: number, mode: Mode, a: string[], b: string[], sa: number, sb: number): Game {
  return { id, playedAt: "", mode, teamA: a, teamB: b, scoreA: sa, scoreB: sb };
}

const GAMES: Game[] = [
  g(1, "1v1", ["duncan"], ["peter"], 21, 18),
  g(2, "1v1", ["duncan"], ["sam"], 21, 10),
  g(3, "2v2", ["duncan", "peter"], ["sam", "alex"], 21, 15),
];
const PLAYERS = ["duncan", "peter", "sam", "alex"];

describe("core/engine replayModes", () => {
  it("overall counts all games", () => {
    const overall = replayModes(PLAYERS, GAMES).overall;
    expect(overall.get("duncan")!.games).toBe(3); // 2 singles + 1 doubles
    expect(overall.get("alex")!.games).toBe(1); // 1 doubles only
  });

  it("singles ignores doubles", () => {
    const singles = replayModes(PLAYERS, GAMES).singles;
    expect(singles.get("duncan")!.games).toBe(2);
    expect(singles.get("duncan")!.wins).toBe(2);
    expect(singles.get("peter")!.games).toBe(1); // only the 1v1 loss
    expect(singles.get("alex")!.games).toBe(0); // never played singles
  });

  it("doubles ignores singles", () => {
    const doubles = replayModes(PLAYERS, GAMES).doubles;
    expect(doubles.get("duncan")!.games).toBe(1);
    expect(doubles.get("alex")!.games).toBe(1);
    expect(doubles.get("alex")!.losses).toBe(1);
  });

  it("ratings are independent across modes", () => {
    const modes = replayModes(PLAYERS, GAMES);
    expect(modes.singles.get("alex")!.rating).toBe(1000); // never played singles
    expect(modes.doubles.get("alex")!.rating).toBeLessThan(1000);
  });
});

describe("core/engine ratingTrend", () => {
  it("has a point per game plus the start", () => {
    const trend = ratingTrend(GAMES, "duncan");
    expect(trend.length).toBe(4); // start + one per game (all 3)
    expect(trend[0]).toBe(1000);
  });

  it("is empty for an unseen player", () => {
    expect(ratingTrend(GAMES, "nobody")).toEqual([]);
  });

  it("opponent filter restricts recorded points but not the replay", () => {
    const trend = ratingTrend(GAMES, "peter", undefined, "duncan");
    expect(trend.length).toBe(2); // start + the one game vs duncan
    expect(trend[trend.length - 1]).toBeLessThan(trend[0]); // peter lost game 1
  });
});
