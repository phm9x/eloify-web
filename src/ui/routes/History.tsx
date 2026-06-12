import { useState, useEffect } from "react";
import { useSnapshot } from "@/data/useSnapshot";
import { useModelKey } from "@/data/useModelKey";
import { resolveModel } from "@/core/elo";
import { applyGame } from "@/core/engine";
import type { Game, PlayerStats } from "@/core/models";
import { DataGate } from "@/ui/components/DataGate";
import { ModelPicker } from "@/ui/components/ModelPicker";
import { PlayerSelect } from "@/ui/components/PlayerSelect";
import { Sparkline } from "@/ui/components/Sparkline";
import { Headshot } from "@/ui/components/Headshot";
import { fmtRating } from "@/ui/format";

interface Row {
  id: number;
  res: "W" | "L";
  mine: number;
  theirs: number;
  opp: string;
  before: number;
  after: number;
}

/** Replay the whole log, recording this player's games (optionally only those
 *  against `opponent`). Mirrors the CLI `history` command. */
function historyRows(
  games: Game[],
  player: string,
  opponent: string | undefined,
  model: ReturnType<typeof resolveModel>,
): Row[] {
  const stats = new Map<string, PlayerStats>();
  const rows: Row[] = [];
  for (const g of games) {
    const before = stats.get(player)?.rating ?? model.startRating;
    applyGame(stats, g, model);
    const onA = g.teamA.includes(player);
    const onB = g.teamB.includes(player);
    if (!onA && !onB) continue;
    const theirTeam = onA ? g.teamB : g.teamA;
    if (opponent && !theirTeam.includes(opponent)) continue;
    const after = stats.get(player)!.rating;
    const mine = onA ? g.scoreA : g.scoreB;
    const theirs = onA ? g.scoreB : g.scoreA;
    rows.push({
      id: g.id,
      res: mine > theirs ? "W" : "L",
      mine,
      theirs,
      opp: theirTeam.join(" & "),
      before,
      after,
    });
  }
  return rows;
}

export function History() {
  const state = useSnapshot();
  const [modelKey, setModelKey] = useModelKey();
  const [player, setPlayer] = useState("");
  const [opponent, setOpponent] = useState("");

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
          const rows = who ? historyRows(games, who, rival, model) : [];
          const wins = rows.filter((r) => r.res === "W").length;
          const losses = rows.length - wins;
          const trend = rows.length ? [rows[0].before, ...rows.map((r) => r.after)] : [];

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
                              <span className={r.res === "W" ? "text-emerald-300" : "text-red-300"}>
                                {r.res}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              {r.mine}-{r.theirs}
                            </td>
                            <td className="px-2 py-2">{r.opp}</td>
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
