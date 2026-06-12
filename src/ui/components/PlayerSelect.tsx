interface PlayerSelectProps {
  label: string;
  value: string;
  players: string[];
  onChange: (name: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
}

export function PlayerSelect({
  label,
  value,
  players,
  onChange,
  allowNone,
  noneLabel = "— none —",
}: PlayerSelectProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-base outline-none focus:border-slate-400"
      >
        {allowNone && <option value="">{noneLabel}</option>}
        {players.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </label>
  );
}
