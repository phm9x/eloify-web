import { describe, it, expect } from "vitest";
import {
  allModels,
  defaultModel,
  getModel,
  register,
  type Matchup,
} from "@/core/elo";

// Port of eloify/tests/test_models.py — registry + per-model behavior.
//
// NOTE: the Python test_models.py asserts the default model is "mov", but the
// actual elo.py sets DEFAULT_MODEL = "provisional" (so those Python assertions
// are stale against their own code). We port to the code's real behavior —
// provisional is the default — which also matches the web spec and config.
function matchup(
  ra: number,
  rb: number,
  sa: number,
  sb: number,
  ga = 0,
  gb = 0,
): Matchup {
  return {
    teamA: [ra],
    teamB: [rb],
    teamAGames: [ga],
    teamBGames: [gb],
    scoreA: sa,
    scoreB: sb,
  };
}

describe("core/elo registry", () => {
  it("default model is provisional", () => {
    expect(defaultModel().key).toBe("provisional");
    expect(getModel(null)).toBe(defaultModel());
  });

  it("lists default first and includes the known models", () => {
    const keys = allModels().map((m) => m.key);
    expect(keys[0]).toBe("provisional");
    expect(new Set(keys)).toEqual(new Set(["mov", "elo", "provisional", "share"]));
  });

  it("unknown model throws", () => {
    expect(() => getModel("nope")).toThrow();
  });

  it("lookup by number agrees with keys", () => {
    const models = allModels();
    expect(getModel("1")).toBe(models[0]);
    expect(getModel("1")).toBe(defaultModel());
    expect(getModel("2")).toBe(models[1]);
    expect(getModel(String(models.length))).toBe(getModel(models[models.length - 1].key));
  });

  it("out-of-range number throws", () => {
    expect(() => getModel("0")).toThrow();
    expect(() => getModel(String(allModels().length + 1))).toThrow();
  });

  it("score-share lets a close loser gain", () => {
    const [[da], [db]] = getModel("share").rate(matchup(900, 1100, 19, 21));
    expect(da).toBeGreaterThan(0);
    expect(db).toBeLessThan(0);
  });

  it("score-share: blowout loss costs more than a close loss", () => {
    const [[close]] = getModel("share").rate(matchup(1000, 1000, 19, 21));
    const [[blowout]] = getModel("share").rate(matchup(1000, 1000, 3, 21));
    expect(close).toBeGreaterThan(blowout);
  });

  it("plain elo ignores margin", () => {
    const [[close]] = getModel("elo").rate(matchup(1000, 1000, 21, 19));
    const [[blowout]] = getModel("elo").rate(matchup(1000, 1000, 21, 3));
    expect(close).toBeCloseTo(blowout, 12);
  });

  it("mov model cares about margin", () => {
    const [[close]] = getModel("mov").rate(matchup(1000, 1000, 21, 19));
    const [[blowout]] = getModel("mov").rate(matchup(1000, 1000, 21, 3));
    expect(blowout).toBeGreaterThan(close);
  });

  it("provisional: a rookie moves more than a veteran", () => {
    const [[rookie]] = getModel("provisional").rate(matchup(1000, 1000, 21, 10, 0));
    const [[vet]] = getModel("provisional").rate(matchup(1000, 1000, 21, 10, 20));
    expect(rookie).toBeGreaterThan(vet);
  });

  it("all models are zero-sum for a 1v1", () => {
    for (const key of ["mov", "elo", "provisional", "share"]) {
      const [[da], [db]] = getModel(key).rate(matchup(1000, 1000, 21, 10));
      expect(da).toBeCloseTo(-db, 12);
    }
  });

  it("register rejects a duplicate key", () => {
    expect(() =>
      register({ key: "mov", label: "x", description: "x", rate: () => [[], []] }),
    ).toThrow();
  });
});
