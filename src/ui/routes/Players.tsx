import { useSnapshot } from "@/data/useSnapshot";
import { useModelKey } from "@/data/useModelKey";
import { resolveModel } from "@/core/elo";
import { leaderboard, replay } from "@/core/engine";
import { DataGate } from "@/ui/components/DataGate";
import { ModelPicker } from "@/ui/components/ModelPicker";
import { fmtRating } from "@/ui/format";

export function Players() {
  const state = useSnapshot();
  const [modelKey, setModelKey] = useModelKey();

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Players</h1>
        <ModelPicker value={modelKey} onChange={setModelKey} />
      </div>

      <DataGate state={state}>
        {({ games, players }) => {
          const stats = replay(players, games, resolveModel(modelKey));
          const ranked = leaderboard(stats);
          if (ranked.length === 0) {
            return <p className="text-slate-500">No players yet.</p>;
          }
          return (
            <ul className="divide-y divide-slate-800">
              {ranked.map((s) => (
                <li key={s.name} className="flex items-center justify-between py-3">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-slate-400">
                    <span className="font-semibold text-slate-200">{fmtRating(s.rating)}</span>
                    <span className="ml-2 text-sm">· {s.games} games</span>
                  </span>
                </li>
              ))}
            </ul>
          );
        }}
      </DataGate>
    </section>
  );
}
