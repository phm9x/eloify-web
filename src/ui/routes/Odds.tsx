import { useState, useEffect } from "react";
import { useSnapshot } from "@/data/useSnapshot";
import { useModelKey } from "@/data/useModelKey";
import { resolveModel, expected, projectedScore } from "@/core/elo";
import { replay, ratingTrend } from "@/core/engine";
import { DataGate } from "@/ui/components/DataGate";
import { ModelPicker } from "@/ui/components/ModelPicker";
import { PlayerSelect } from "@/ui/components/PlayerSelect";
import { Sparkline } from "@/ui/components/Sparkline";
import { Headshot } from "@/ui/components/Headshot";
import { fmtRating } from "@/ui/format";

export function Odds() {
  const state = useSnapshot();
  const [modelKey, setModelKey] = useModelKey();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  const players = state.data?.players ?? [];
  // Default to the first two distinct players once data arrives.
  useEffect(() => {
    if (!p1 && players.length) setP1(players[0]);
    if (!p2 && players.length > 1) setP2(players[1]);
  }, [p1, p2, players]);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Odds</h1>
        <ModelPicker value={modelKey} onChange={setModelKey} />
      </div>

      <DataGate state={state}>
        {({ games, players: known }) => {
          const model = resolveModel(modelKey);
          const a = p1 || known[0] || "";
          const b = p2 || known[1] || "";
          const sameOrMissing = !a || !b || a === b;

          const stats = replay(known, games, model);
          const r1 = stats.get(a)?.rating ?? model.startRating;
          const r2 = stats.get(b)?.rating ?? model.startRating;
          const p1Win = expected(r1, r2);
          const favProb = Math.max(p1Win, 1 - p1Win);
          const fav = p1Win >= 0.5 ? a : b;
          const [favPts, dogPts] = projectedScore(favProb);

          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <PlayerSelect label="Player 1" value={a} players={known} onChange={setP1} />
                <PlayerSelect label="Player 2" value={b} players={known} onChange={setP2} />
              </div>

              {sameOrMissing ? (
                <p className="text-slate-500">Pick two different players.</p>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-6 rounded-xl bg-slate-900 p-6">
                    <div className="text-center">
                      <Headshot name={a} />
                      <div className="mt-2 font-semibold">{a}</div>
                      <div className="text-sm text-slate-400">{fmtRating(r1)}</div>
                      <div className="mt-1 text-2xl font-bold">{Math.round(p1Win * 100)}%</div>
                    </div>
                    <div className="text-center text-slate-500">
                      <div className="text-sm">vs</div>
                      <div className="mt-2 text-sm">
                        score{" "}
                        <span className="font-bold text-slate-200">
                          {favPts}–{dogPts}
                        </span>
                      </div>
                      <div className="text-xs">{fav}</div>
                    </div>
                    <div className="text-center">
                      <Headshot name={b} />
                      <div className="mt-2 font-semibold">{b}</div>
                      <div className="text-sm text-slate-400">{fmtRating(r2)}</div>
                      <div className="mt-1 text-2xl font-bold">{Math.round((1 - p1Win) * 100)}%</div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {[a, b].map((who) => (
                      <div key={who} className="rounded-xl bg-slate-900 p-4">
                        <div className="text-sm text-slate-400">📈 {who}</div>
                        <Sparkline series={ratingTrend(games, who, model)} className="mt-2" />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        }}
      </DataGate>
    </section>
  );
}
