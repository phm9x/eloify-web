import { describe, it, expect } from "vitest";
import { computeDeltas, expected, getModel, projectedScore, type Matchup } from "@/core/elo";

// Numeric parity with the Python implementation. The reference values below
// were produced by running eloify/src/eloify/elo.py directly:
//
//   expected(1000,1200)                       -> 0.2402530733520421
//   compute_deltas(1000,1000,21,18)           -> 16.635532333438686
//   compute_deltas(900,1100,21,15)            -> 39.029740339335085
//   provisional rate, rookie (0 games)        -> 49.698132995760005
//   provisional rate, vet teamA (20 games)    -> 29.818879797456006  (teamB still -49.69…)
//   share rate (900 vs 1100, 19-21)           ->  5.6339262395509895
//   projected_score: 0.65->(21,11) 0.5->(21,19) 0.95->(21,1)
//
// Asserting to 12 decimals proves the float math agrees bit-for-bit in practice.
function matchup(ra: number, rb: number, sa: number, sb: number, ga = 0, gb = 0): Matchup {
  return { teamA: [ra], teamB: [rb], teamAGames: [ga], teamBGames: [gb], scoreA: sa, scoreB: sb };
}

describe("core/elo Python parity", () => {
  it("expected()", () => {
    expect(expected(1000, 1200)).toBeCloseTo(0.2402530733520421, 12);
  });

  it("computeDeltas() MoV", () => {
    expect(computeDeltas(1000, 1000, 21, 18)[0]).toBeCloseTo(16.635532333438686, 12);
    expect(computeDeltas(900, 1100, 21, 15)[0]).toBeCloseTo(39.029740339335085, 12);
  });

  it("provisional rate: per-player K (rookie vs veteran)", () => {
    const rookie = getModel("provisional").rate(matchup(1000, 1000, 21, 10, 0));
    expect(rookie[0][0]).toBeCloseTo(49.698132995760005, 12);

    const vet = getModel("provisional").rate(matchup(1000, 1000, 21, 10, 20));
    expect(vet[0][0]).toBeCloseTo(29.818879797456006, 12); // teamA K=24
    expect(vet[1][0]).toBeCloseTo(-49.698132995760005, 12); // teamB still rookie K=40
  });

  it("share rate: close underdog loss still gains", () => {
    const share = getModel("share").rate(matchup(900, 1100, 19, 21));
    expect(share[0][0]).toBeCloseTo(5.6339262395509895, 12);
  });

  it("projectedScore() matches Python round()", () => {
    expect(projectedScore(0.65)).toEqual([21, 11]);
    expect(projectedScore(0.5)).toEqual([21, 19]);
    expect(projectedScore(0.95)).toEqual([21, 1]);
  });
});
