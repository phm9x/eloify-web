import { useState } from "react";
import { useSnapshot } from "@/data/useSnapshot";
import { useModelKey } from "@/data/useModelKey";
import { resolveModel } from "@/core/elo";
import { leaderboard, replay } from "@/core/engine";
import { DataGate } from "@/ui/components/DataGate";
import { ModelPicker } from "@/ui/components/ModelPicker";
import { PlayerDetail } from "@/ui/components/PlayerDetail";
import { fmtRating } from "@/ui/format";

export function Players() {
  const state = useSnapshot();
  const [modelKey, setModelKey] = useModelKey();
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(name: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
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
