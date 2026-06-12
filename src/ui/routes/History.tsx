import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSnapshot } from "@/data/useSnapshot";
import { useModelKey } from "@/data/useModelKey";
import { resolveModel } from "@/core/elo";
import { playerHistory, trendFromRows } from "@/core/playerHistory";
import { DataGate } from "@/ui/components/DataGate";
import { ModelPicker } from "@/ui/components/ModelPicker";
import { PlayerSelect } from "@/ui/components/PlayerSelect";
import { Sparkline } from "@/ui/components/Sparkline";
import { Headshot } from "@/ui/components/Headshot";
import { fmtRating } from "@/ui/format";

export function History() {
  const state = useSnapshot();
  const [modelKey, setModelKey] = useModelKey();
  const [searchParams] = useSearchParams();
  const [player, setPlayer] = useState(() => searchParams.get("player") ?? "");
  const [opponent, setOpponent] = useState("");

  // Follow the ?player= param (e.g. arriving from the Players tab).
  useEffect(() => {
    const p = searchParams.get("player");
    if (p) {
      setPlayer(p);
      setOpponent("");
    }
  }, [searchParams]);

  // Default the player selection once data arrives.
  const players = state.data?.players ?? [];
  useEffect(() => {
    if (!player && players.length) setPlayer(players[0]);
  }, [player, players]);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">History</h1>
        <ModelPicker value={modelKey} onChange={setModelKey} />
      </div>

      <DataGate state={state}>
        {({ games, players: known }) => {
          const model = resolveModel(modelKey);
          const who = player || known[0] || "";
          const rival = opponent || undefined;
          const rows = who ? playerHistory(games, who, model, rival) : [];
          const wins = rows.filter((r) => r.result === "W").length;
          const losses = rows.length - wins;
          const trend = trendFromRows(rows);

          return (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <PlayerSelect label="Player" value={who} players={known} onChange={setPlayer} />
                <PlayerSelect
                  label="Opponent (head-to-head)"
                  value={opponent}
                  players={known.filter((p) => p !== who)}
                  onChange={setOpponent}
                  allowNone
                  noneLabel="— all opponents —"
                />
              </div>

              {rows.length === 0 ? (
                <p className="text-slate-500">
                  {rival ? `${who} hasn’t faced ${rival} yet.` : `${who} hasn’t played yet.`}
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-4 rounded-xl bg-slate-900 p-4">
                    {!rival && <Headshot name={who} />}
                    <div className="flex-1">
                      <div className="text-sm text-slate-400">
                        {rival ? `${who} vs ${rival}` : who} · {wins}-{losses} · {model.label}
                      </div>
                      <Sparkline series={trend} className="mt-2" />
                    </div>
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
