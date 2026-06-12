import { useState } from "react";
import { useSnapshot } from "@/data/useSnapshot";
import { useModelKey } from "@/data/useModelKey";
import { resolveModel } from "@/core/elo";
import { leaderboard, replayModes } from "@/core/engine";
import type { PlayerStats } from "@/core/models";
import { DataGate } from "@/ui/components/DataGate";
import { ModelPicker } from "@/ui/components/ModelPicker";
import { RefreshButton } from "@/ui/components/RefreshButton";
import {
  LeaderboardTable,
  ratingCol,
  recordCols,
  type Column,
} from "@/ui/components/LeaderboardTable";
import { fmtRating } from "@/ui/format";

type View = "overall" | "singles" | "doubles";
const VIEWS: View[] = ["overall", "singles", "doubles"];

export function Board() {
  const state = useSnapshot();
  const [modelKey, setModelKey] = useModelKey();
  const [view, setView] = useState<View>("overall");

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Board</h1>
        <div className="flex items-center gap-3">
          <ModelPicker value={modelKey} onChange={setModelKey} />
          <RefreshButton onClick={state.refresh} busy={state.loading} />
        </div>
      </div>

      <div className="mb-5 inline-flex rounded-full bg-slate-800/60 p-1">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={[
              "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              view === v ? "bg-slate-100 text-slate-900" : "text-slate-300",
            ].join(" ")}
          >
            {v}
          </button>
        ))}
      </div>

      <DataGate state={state}>
        {({ games, players }) => {
          const model = resolveModel(modelKey);
          const modes = replayModes(players, games, model);

          if (view === "overall") {
            const ranked = leaderboard(modes.overall).filter((s) => s.games > 0);
            const cell = (stats: Map<string, PlayerStats>, name: string) => {
              const s = stats.get(name);
              return s && s.games > 0 ? fmtRating(s.rating) : "–";
            };
            const columns: Column[] = [
              ratingCol("overall", "Overall"),
              { key: "singles", header: "Singles", align: "right", cell: (s) => cell(modes.singles, s.name) },
              { key: "doubles", header: "Doubles", align: "right", cell: (s) => cell(modes.doubles, s.name) },
              ...recordCols,
            ];
            return <LeaderboardTable rows={ranked} columns={columns} />;
          }

          const stats = view === "singles" ? modes.singles : modes.doubles;
          const ranked = leaderboard(stats).filter((s) => s.games > 0);
          if (ranked.length === 0) {
            return <p className="text-slate-500">No {view} games logged yet.</p>;
          }
          return (
            <LeaderboardTable rows={ranked} columns={[ratingCol(view, "ELO"), ...recordCols]} />
          );
        }}
      </DataGate>
    </section>
  );
}
