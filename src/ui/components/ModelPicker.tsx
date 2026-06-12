import { allModels } from "@/core/elo";

interface ModelPickerProps {
  value: string;
  onChange: (key: string) => void;
}

/** Select the active rating model. Choices come from the model registry, in
 *  the canonical default-first order. */
export function ModelPicker({ value, onChange }: ModelPickerProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-400">
      <span>Model</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-400"
      >
        {allModels().map((m) => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}
