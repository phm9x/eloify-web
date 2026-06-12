import type { Game } from "@/core/models";
import type { Model } from "@/core/elo";
import { playerHistory, trendFromRows } from "@/core/playerHistory";
import { Sparkline } from "@/ui/components/Sparkline";

/** Inline player detail: rating graph beside the recent games (stacks on narrow
 *  screens). Shared by the Players board and the Board leaderboard. */
export function PlayerDetail({
  name,
  games,
  model,
}: {
  name: string;
  games: Game[];
  model: Model;
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
    <div className="grid gap-4 px-2 pb-4 md:grid-cols-[7fr_3fr]">
      {/* graph (~70%) */}
      <div className="rounded-lg bg-slate-950/60 p-3">
        <div className="mb-1 text-xs text-slate-400">
          rating · {wins}-{losses} · {model.label}
        </div>
        <Sparkline series={trend} height={104} />
      </div>

      {/* recent games (~30%) */}
      <div className="rounded-lg bg-slate-950/60 p-3">
        <div className="mb-1 text-xs text-slate-400">recent</div>
        <ul className="divide-y divide-slate-800/70">
          {recent.map((r) => (
            <li key={r.id} className="flex items-center gap-2 py-1.5 text-sm">
              <span
                className={`w-4 shrink-0 font-semibold ${r.result === "W" ? "text-emerald-300" : "text-red-300"}`}
              >
                {r.result}
              </span>
              <span className="shrink-0 font-mono text-slate-300">
                {r.mine}-{r.theirs}
              </span>
              <span className="truncate text-slate-400">{r.opponent}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
