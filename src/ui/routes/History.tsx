import { useState } from "react";
import { useSnapshot } from "@/data/useSnapshot";
import { Store } from "@/data/sheets";
import { invalidateSnapshot } from "@/data/snapshot";
import type { Game } from "@/core/models";
import { DataGate } from "@/ui/components/DataGate";
import { RecentGames } from "@/ui/components/RecentGames";
import { RefreshButton } from "@/ui/components/RefreshButton";

export function History() {
  const state = useSnapshot();
  const [n, setN] = useState(25);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(game: Game) {
    const label = `#${game.id}: ${game.teamA.join(" & ")} ${game.scoreA}–${game.scoreB} ${game.teamB.join(" & ")}`;
    if (!window.confirm(`Delete this game?\n\n${label}\n\nRatings will recompute from the remaining log.`)) {
      return;
    }
    setBusyId(game.id);
    setError(null);
    try {
      await new Store(state.config).deleteGame(game.id);
      invalidateSnapshot();
      state.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">History</h1>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-400">
            <span>Show</span>
            <input
              type="number"
              min={1}
              max={500}
              value={n}
              onChange={(e) => setN(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
              className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-center outline-none focus:border-slate-400"
            />
          </label>
          <RefreshButton onClick={state.refresh} busy={state.loading} />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-200">{error}</div>
      )}

      <DataGate state={state}>
        {({ games }) => <RecentGames games={games} count={n} onDelete={onDelete} busyId={busyId} />}
      </DataGate>
    </section>
  );
}
