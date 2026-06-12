import { allModels, defaultModel } from "@/core/elo";
import { useModelKey } from "@/data/useModelKey";

// Fully offline — the model registry is static, so this screen needs no sheet.
export function Models() {
  const [active, setActive] = useModelKey();
  const def = defaultModel().key;

  return (
    <section>
      <h1 className="text-2xl font-bold">Rating models</h1>
      <p className="mt-2 text-slate-400">
        Tap a model to make it active everywhere (remembered on this device).
      </p>

      <ul className="mt-6 space-y-3">
        {allModels().map((m, i) => {
          const isActive = m.key === active;
          return (
            <li key={m.key}>
              <button
                onClick={() => setActive(m.key)}
                className={[
                  "w-full rounded-xl border p-4 text-left transition-colors",
                  isActive
                    ? "border-slate-300 bg-slate-800"
                    : "border-slate-800 bg-slate-900 active:bg-slate-800",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{i + 1}</span>
                  <span className="font-semibold">{m.label}</span>
                  {m.key === def && (
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                      default
                    </span>
                  )}
                  {isActive && (
                    <span className="ml-auto rounded-full bg-emerald-800/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200">
                      active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-400">{m.description}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
