import type { PlayerStats } from "@/core/models";
import { winPct } from "@/core/models";
import { fmtRating } from "@/ui/format";

export interface Column {
  key: string;
  header: string;
  /** Cell value for a row; returns a string already formatted. */
  cell: (s: PlayerStats, rank: number) => string;
  align?: "left" | "right";
  emphasis?: boolean;
}

/** Rank + name + the supplied stat columns. Mobile-friendly, zebra rows. */
export function LeaderboardTable({
  rows,
  columns,
}: {
  rows: PlayerStats[];
  columns: Column[];
}) {
  if (rows.length === 0) {
    return <p className="text-slate-500">No players yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-700 text-slate-400">
            <th className="px-2 py-2 text-right font-medium">#</th>
            <th className="px-2 py-2 text-left font-medium">Player</th>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-2 py-2 font-medium ${c.align === "left" ? "text-left" : "text-right"}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.name} className="border-b border-slate-800/60">
              <td className="px-2 py-2 text-right text-slate-500">{i + 1}</td>
              <td className="px-2 py-2 font-medium">{s.name}</td>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={[
                    "px-2 py-2",
                    c.align === "left" ? "text-left" : "text-right",
                    c.emphasis ? "font-bold" : "",
                  ].join(" ")}
                >
                  {c.cell(s, i + 1)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Reusable column builders shared by the Board views.
export const ratingCol = (key: string, header: string): Column => ({
  key,
  header,
  align: "right",
  emphasis: true,
  cell: (s) => fmtRating(s.rating),
});

export const recordCols: Column[] = [
  { key: "wl", header: "W-L", align: "right", cell: (s) => `${s.wins}-${s.losses}` },
  { key: "pct", header: "Win%", align: "right", cell: (s) => `${Math.round(winPct(s))}%` },
  { key: "games", header: "Games", align: "right", cell: (s) => String(s.games) },
];
