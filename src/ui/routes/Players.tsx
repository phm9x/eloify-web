import { useState } from "react";
import { useSnapshot } from "@/data/useSnapshot";
import { useModelKey } from "@/data/useModelKey";
import { resolveModel } from "@/core/elo";
import { leaderboard, replay } from "@/core/engine";
import { playerHistory, trendFromRows } from "@/core/playerHistory";
import type { Game } from "@/core/models";
import { DataGate } from "@/ui/components/DataGate";
import { ModelPicker } from "@/ui/components/ModelPicker";
import { Sparkline } from "@/ui/components/Sparkline";
import { fmtRating } from "@/ui/format";

/** Inline expansion: rating sparkline + the player's 5 most recent games. */
function PlayerDetail({
  name,
  games,
  model,
}: {
  name: string;
  games: Game[];
  model: ReturnType<typeof resolveModel>;
}) {
  const rows = playerHistory(games, name, model);
  const trend = trendFromRows(rows);
  const wins = rows.filter((r) => r.result === "W").length;
  const losses = rows.length - wins;
  const recent = rows.slice(-5).reverse();

  if (rows.length === 0) {
    return <p className="px-2 pb-3 text-sm text-slate-500">No games yet.</p>;
  }
  return (
    <div className="space-y-3 px-2 pb-4">
      <div className="rounded-lg bg-slate-950/60 p-3">
        <div className="mb-1 text-xs text-slate-400">
          rating · {wins}-{losses} · {model.label}
        </div>
        <Sparkline series={trend} />
      </div>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {recent.map((r) => (
            <tr key={r.id} className="border-b border-slate-800/60 last:border-0">
              <td className="py-1.5 pr-2 text-slate-500">#{r.id}</td>
              <td className="py-1.5 pr-2">
                <span className={r.result === "W" ? "text-emerald-300" : "text-red-300"}>
                  {r.result}
                </span>
              </td>
              <td className="py-1.5 pr-2 font-mono">
                {r.mine}-{r.theirs}
              </td>
              <td className="py-1.5 pr-2 text-slate-300">{r.opponent}</td>
              <td className="py-1.5 text-right text-slate-400">
                {fmtRating(r.before)}→{fmtRating(r.after)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Players() {
  const state = useSnapshot();
  const [modelKey, setModelKey] = useModelKey();
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(name: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Players</h1>
        <ModelPicker value={modelKey} onChange={setModelKey} />
      </div>

      <DataGate state={state}>
        {({ games, players }) => {
          const model = resolveModel(modelKey);
          const ranked = leaderboard(replay(players, games, model));
          if (ranked.length === 0) {
            return <p className="text-slate-500">No players yet.</p>;
          }
          return (
            <ul className="divide-y divide-slate-800">
              {ranked.map((s) => {
                const isOpen = open.has(s.name);
                return (
                  <li key={s.name}>
                    <button
                      onClick={() => toggle(s.name)}
                      aria-expanded={isOpen}
                      className="-mx-2 flex w-[calc(100%+1rem)] items-center justify-between rounded-lg px-2 py-3 text-left active:bg-slate-800"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <span
                          className={`text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                          aria-hidden
                        >
                          ›
                        </span>
                        {s.name}
                      </span>
                      <span className="text-slate-400">
                        <span className="font-semibold text-slate-200">{fmtRating(s.rating)}</span>
                        <span className="ml-2 text-sm">· {s.games} games</span>
                      </span>
                    </button>
                    {isOpen && <PlayerDetail name={s.name} games={games} model={model} />}
                  </li>
                );
              })}
            </ul>
          );
        }}
      </DataGate>
    </section>
  );
}
