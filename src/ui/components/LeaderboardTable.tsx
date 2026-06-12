import { Fragment, useState, type ReactNode } from "react";
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

/** Rank + name + the supplied stat columns. Mobile-friendly. When `renderDetail`
 *  is given, rows become tappable and expand an inline detail panel in place
 *  (multiple rows can be open at once). */
export function LeaderboardTable({
  rows,
  columns,
  renderDetail,
}: {
  rows: PlayerStats[];
  columns: Column[];
  renderDetail?: (s: PlayerStats) => ReactNode;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const expandable = Boolean(renderDetail);
  const totalCols = 2 + columns.length;

  function toggle(name: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

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
          {rows.map((s, i) => {
            const isOpen = expandable && open.has(s.name);
            return (
              <Fragment key={s.name}>
                <tr
                  onClick={expandable ? () => toggle(s.name) : undefined}
                  aria-expanded={expandable ? isOpen : undefined}
                  className={[
                    "border-b border-slate-800/60",
                    expandable ? "cursor-pointer active:bg-slate-800/60" : "",
                  ].join(" ")}
                >
                  <td className="px-2 py-2 text-right text-slate-500">{i + 1}</td>
                  <td className="px-2 py-2 font-medium">
                    {expandable && (
                      <span
                        className={`mr-1.5 inline-block text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                        aria-hidden
                      >
                        ›
                      </span>
                    )}
                    {s.name}
                  </td>
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
                {isOpen && (
                  <tr>
                    <td colSpan={totalCols} className="p-0">
                      {renderDetail!(s)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
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
