export function RefreshButton({
  onClick,
  busy,
}: {
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 active:bg-slate-700 disabled:opacity-50"
    >
      {busy ? "Refreshing…" : "Refresh"}
    </button>
  );
}
