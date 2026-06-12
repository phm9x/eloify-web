import { useState } from "react";
import {
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  isConfigured,
  type AppConfig,
} from "@/data/config";
import { ModelSection } from "@/ui/components/ModelSection";

type Field = {
  key: keyof AppConfig;
  label: string;
  hint: string;
  type?: "text" | "number" | "password";
  placeholder?: string;
};

const FIELDS: Field[] = [
  {
    key: "spreadsheetId",
    label: "Spreadsheet ID",
    hint: "The long id from the Google Sheet URL (…/d/THIS_PART/edit).",
    placeholder: "13V6-luJnRIZCEG3C-M_…",
  },
  {
    key: "workerBaseUrl",
    label: "Worker URL",
    hint: "Base URL of the Cloudflare Worker proxy. The app never signs in — the Worker holds the key.",
    placeholder: "https://eloify.<subdomain>.workers.dev",
  },
  {
    key: "sharedToken",
    label: "Shared token (optional)",
    hint: "If the Worker is gated by a shared token, set it here. Sent as a bearer header.",
    type: "password",
  },
  {
    key: "gamesGid",
    label: "Games tab gid",
    hint: "Worksheet gid for the Games tab (default 0).",
    type: "number",
  },
  {
    key: "playersGid",
    label: "Players tab gid",
    hint: "Worksheet gid for the Players tab.",
    type: "number",
  },
];

export function Settings() {
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
    setSaved(false);
  }

  function onSave() {
    saveConfig(config);
    setSaved(true);
  }

  function onReset() {
    setConfig({ ...DEFAULT_CONFIG });
    setSaved(false);
  }

  const ready = isConfigured(config);

  return (
    <section className="max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-2 text-slate-400">
        Stored on this device only (localStorage) — nothing is baked into the build.
      </p>

      <div
        className={[
          "mt-4 rounded-lg px-3 py-2 text-sm",
          ready ? "bg-emerald-900/40 text-emerald-200" : "bg-amber-900/40 text-amber-200",
        ].join(" ")}
      >
        {ready
          ? "Ready — spreadsheet and Worker are set."
          : "Set the spreadsheet ID and Worker URL to connect."}
      </div>

      <div className="mt-6 space-y-5">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-sm font-medium text-slate-200">{f.label}</span>
            <input
              type={f.type ?? "text"}
              inputMode={f.type === "number" ? "numeric" : undefined}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={f.placeholder}
              value={String(config[f.key] ?? "")}
              onChange={(e) =>
                update(
                  f.key,
                  (f.type === "number"
                    ? Number(e.target.value || 0)
                    : e.target.value) as AppConfig[typeof f.key],
                )
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-base outline-none focus:border-slate-400"
            />
            <span className="mt-1 block text-xs text-slate-500">{f.hint}</span>
          </label>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={onSave}
          className="rounded-lg bg-slate-100 px-5 py-3 font-semibold text-slate-900 active:bg-slate-300"
        >
          Save
        </button>
        <button
          onClick={onReset}
          className="rounded-lg bg-slate-800 px-5 py-3 font-semibold text-slate-200 active:bg-slate-700"
        >
          Reset
        </button>
        {saved && <span className="text-sm text-emerald-300">Saved.</span>}
      </div>

      <hr className="my-8 border-slate-800" />
      <ModelSection />
    </section>
  );
}
