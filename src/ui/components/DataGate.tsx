import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { SnapshotState } from "@/data/useSnapshot";

/** Renders the right placeholder for not-configured / loading / error states,
 *  or `children` once a snapshot is available. */
export function DataGate({
  state,
  children,
}: {
  state: SnapshotState;
  children: (data: NonNullable<SnapshotState["data"]>) => ReactNode;
}) {
  if (!state.configured) {
    return (
      <div className="rounded-lg bg-amber-900/30 p-4 text-amber-200">
        Not connected yet. Add your spreadsheet ID and Worker URL in{" "}
        <Link to="/settings" className="font-semibold underline">
          Settings
        </Link>
        .
      </div>
    );
  }
  if (state.loading && !state.data) {
    return <div className="animate-pulse text-slate-400">Loading…</div>;
  }
  if (state.error) {
    return (
      <div className="rounded-lg bg-red-900/30 p-4 text-red-200">
        <p className="font-semibold">Couldn’t load data.</p>
        <p className="mt-1 text-sm opacity-90">{state.error}</p>
        <button
          onClick={state.refresh}
          className="mt-3 rounded-md bg-red-800/60 px-3 py-1.5 text-sm font-medium active:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!state.data) return null;
  return <>{children(state.data)}</>;
}
