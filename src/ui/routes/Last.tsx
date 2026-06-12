import { useState } from "react";
import { useSnapshot } from "@/data/useSnapshot";
import { DataGate } from "@/ui/components/DataGate";
import { RefreshButton } from "@/ui/components/RefreshButton";

export function Last() {
  const state = useSnapshot();
  const [n, setN] = useState(5);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Last games</h1>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-400">
            <span>Show</span>
            <input
              type="number"
              min={1}
              max={50}
              value={n}
              onChange={(e) => setN(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-center outline-none focus:border-slate-400"
            />
          </label>
          <RefreshButton onClick={state.refresh} busy={state.loading} />
        </div>
      </div>

      <DataGate state={state}>
        {({ games }) => {
          const recent = games.slice(-n).reverse();
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
                    <span className={`flex-1 text-right ${teamClass(aWon)}`}>
                      {g.teamA.join(" & ")}
                    </span>
                    <span className="shrink-0 font-mono text-slate-400">
                      {g.scoreA}–{g.scoreB}
                    </span>
                    <span className={`flex-1 ${teamClass(!aWon)}`}>{g.teamB.join(" & ")}</span>
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
