import { useState, useEffect } from "react";
import { useSnapshot } from "@/data/useSnapshot";
import { useModelKey } from "@/data/useModelKey";
import { resolveModel, expected, projectedScore } from "@/core/elo";
import { replay } from "@/core/engine";
import { playerHistory, trendFromRows } from "@/core/playerHistory";
import { DataGate } from "@/ui/components/DataGate";
import { ModelPicker } from "@/ui/components/ModelPicker";
import { PlayerSelect } from "@/ui/components/PlayerSelect";
import { Sparkline } from "@/ui/components/Sparkline";
import { fmtRating } from "@/ui/format";

// Combined view: a player's rating history plus, when an opponent is chosen,
// the odds (win probability + projected score) and a head-to-head record.
export function Odds() {
  const state = useSnapshot();
  const [modelKey, setModelKey] = useModelKey();
  const [player, setPlayer] = useState("");
  const [opponent, setOpponent] = useState("");

  const players = state.data?.players ?? [];
  useEffect(() => {
    if (!player && players.length) setPlayer(players[0]);
  }, [player, players]);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Odds</h1>
        <ModelPicker value={modelKey} onChange={setModelKey} />
      </div>

      <DataGate state={state}>
        {({ games, players: known }) => {
          const model = resolveModel(modelKey);
          const who = player || known[0] || "";
          const rival = opponent && opponent !== who ? opponent : undefined;

          const stats = replay(known, games, model);
          const r1 = stats.get(who)?.rating ?? model.startRating;
          const r2 = rival ? (stats.get(rival)?.rating ?? model.startRating) : null;
          const p1Win = r2 != null ? expected(r1, r2) : null;
          const favProb = p1Win != null ? Math.max(p1Win, 1 - p1Win) : null;
          const [favPts, dogPts] = favProb != null ? projectedScore(favProb) : [0, 0];
          const favName = p1Win != null ? (p1Win >= 0.5 ? who : rival!) : "";

          const rows = who ? playerHistory(games, who, model, rival) : [];
          const trend = trendFromRows(rows);
          const wins = rows.filter((r) => r.result === "W").length;
          const losses = rows.length - wins;

          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <PlayerSelect label="Player" value={who} players={known} onChange={setPlayer} />
                <PlayerSelect
                  label="Opponent (for odds + head-to-head)"
                  value={opponent}
                  players={known.filter((p) => p !== who)}
                  onChange={setOpponent}
                  allowNone
                  noneLabel="— none —"
                />
              </div>

              {/* odds (only with an opponent) */}
              {p1Win != null && rival && (
                <div className="rounded-xl bg-slate-900 p-4">
                  <div className="flex items-center justify-between text-lg">
                    <span>
                      <span className="font-semibold">{who}</span>{" "}
                      <span className="text-slate-400">{fmtRating(r1)}</span>{" "}
                      <span className="font-bold">{Math.round(p1Win * 100)}%</span>
                    </span>
                    <span className="text-sm text-slate-500">vs</span>
                    <span className="text-right">
                      <span className="font-bold">{Math.round((1 - p1Win) * 100)}%</span>{" "}
                      <span className="text-slate-400">{fmtRating(r2!)}</span>{" "}
                      <span className="font-semibold">{rival}</span>
                    </span>
                  </div>
                  <div className="mt-2 text-center text-sm text-slate-400">
                    projected{" "}
                    <span className="font-bold text-slate-200">
                      {favPts}–{dogPts}
                    </span>{" "}
                    {favName}
                  </div>
                </div>
              )}

              {/* history */}
              {rows.length === 0 ? (
                <p className="text-slate-500">
                  {rival ? `${who} hasn’t faced ${rival} yet.` : `${who} hasn’t played yet.`}
                </p>
              ) : (
                <>
                  <div className="rounded-xl bg-slate-900 p-4">
                    <div className="mb-1 text-sm text-slate-400">
                      {rival ? `${who} vs ${rival}` : who} · {wins}-{losses} · {model.label}
                    </div>
                    <Sparkline series={trend} height={104} />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="px-2 py-2 text-right font-medium">#</th>
                          <th className="px-2 py-2 text-left font-medium">Result</th>
                          <th className="px-2 py-2 text-right font-medium">Score</th>
                          <th className="px-2 py-2 text-left font-medium">Opponent</th>
                          <th className="px-2 py-2 text-right font-medium">ELO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(-15).reverse().map((r) => (
                          <tr key={r.id} className="border-b border-slate-800/60">
                            <td className="px-2 py-2 text-right text-slate-500">{r.id}</td>
                            <td className="px-2 py-2">
                              <span className={r.result === "W" ? "text-emerald-300" : "text-red-300"}>
                                {r.result}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              {r.mine}-{r.theirs}
                            </td>
                            <td className="px-2 py-2">{r.opponent}</td>
                            <td className="px-2 py-2 text-right text-slate-400">
                              {fmtRating(r.before)}→{fmtRating(r.after)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
