import type { Game } from "@/core/models";

/** The last `count` games, newest first, winner highlighted. When `onDelete` is
 *  provided each row gets an ✕ to remove that game. */
export function RecentGames({
  games,
  count,
  onDelete,
  busyId,
}: {
  games: Game[];
  count: number;
  onDelete?: (game: Game) => void;
  busyId?: number | null;
}) {
  const recent = games.slice(-count).reverse();
  if (recent.length === 0) {
    return <p className="text-slate-500">No games logged yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-800">
      {recent.map((g) => {
        const aWon = g.scoreA > g.scoreB;
        const teamClass = (won: boolean) =>
          won ? "font-semibold text-emerald-300" : "text-slate-300";
        return (
          <li key={g.id} className="flex items-center gap-3 py-3">
            <span className="w-10 shrink-0 text-right text-sm text-slate-500">#{g.id}</span>
            <span className={`flex-1 text-right ${teamClass(aWon)}`}>{g.teamA.join(" & ")}</span>
            <span className="shrink-0 font-mono text-slate-400">
              {g.scoreA}–{g.scoreB}
            </span>
            <span className={`flex-1 ${teamClass(!aWon)}`}>{g.teamB.join(" & ")}</span>
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
