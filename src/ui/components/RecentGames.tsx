import { Fragment } from "react";
import type { Game } from "@/core/models";

function Team({
  names,
  won,
  onPlayerClick,
}: {
  names: string[];
  won: boolean;
  onPlayerClick?: (name: string) => void;
}) {
  const cls = won ? "font-semibold text-emerald-300" : "text-slate-300";
  if (!onPlayerClick) return <span className={cls}>{names.join(" & ")}</span>;
  return (
    <span className={cls}>
      {names.map((n, i) => (
        <Fragment key={n}>
          {i > 0 && " & "}
          <button
            onClick={() => onPlayerClick(n)}
            className="underline-offset-2 hover:underline active:text-slate-100"
          >
            {n}
          </button>
        </Fragment>
      ))}
    </span>
  );
}

/** The last `count` games, newest first, winner highlighted. When `onDelete` is
 *  provided each row gets an ✕ to remove that game; when `onPlayerClick` is
 *  provided each player name is tappable. */
export function RecentGames({
  games,
  count,
  onDelete,
  busyId,
  onPlayerClick,
}: {
  games: Game[];
  count: number;
  onDelete?: (game: Game) => void;
  busyId?: number | null;
  onPlayerClick?: (name: string) => void;
}) {
  const recent = games.slice(-count).reverse();
  if (recent.length === 0) {
    return <p className="text-slate-500">No games logged yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-800">
      {recent.map((g) => {
        const aWon = g.scoreA > g.scoreB;
        return (
          <li key={g.id} className="flex items-center gap-3 py-3">
            <span className="w-10 shrink-0 text-right text-sm text-slate-500">#{g.id}</span>
            <span className="flex-1 text-right">
              <Team names={g.teamA} won={aWon} onPlayerClick={onPlayerClick} />
            </span>
            <span className="shrink-0 font-mono text-slate-400">
              {g.scoreA}–{g.scoreB}
            </span>
            <span className="flex-1">
              <Team names={g.teamB} won={!aWon} onPlayerClick={onPlayerClick} />
            </span>
            {onDelete && (
              <button
                onClick={() => onDelete(g)}
                disabled={busyId === g.id}
                aria-label={`Delete game #${g.id}`}
                className="shrink-0 rounded-md px-2 py-1 text-slate-500 hover:text-red-300 active:bg-slate-800 disabled:opacity-40"
              >
                {busyId === g.id ? "…" : "✕"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
