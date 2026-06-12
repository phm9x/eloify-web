import { useState } from "react";
import { useSnapshot } from "@/data/useSnapshot";
import { useModelKey } from "@/data/useModelKey";
import { resolveModel } from "@/core/elo";
import { replay, previewGame } from "@/core/engine";
import type { Mode } from "@/core/models";
import { validateScore, ScoreError } from "@/core/validate";
import { Store } from "@/data/sheets";
import { invalidateSnapshot } from "@/data/snapshot";
import { DataGate } from "@/ui/components/DataGate";
import { ModelPicker } from "@/ui/components/ModelPicker";
import { RecentGames } from "@/ui/components/RecentGames";
import { fmtRating, fmtDelta } from "@/ui/format";

type Banner = { kind: "ok" | "err"; text: string } | null;

/** Map a typed token to a known player's canonical casing, else keep as-is (new). */
function canonical(token: string, known: string[]): string {
  const hit = known.find((n) => n.toLowerCase() === token.trim().toLowerCase());
  return hit ?? token.trim();
}

export function AddGame() {
  const state = useSnapshot();
  const [modelKey, setModelKey] = useModelKey();

  const [mode, setMode] = useState<Mode>("1v1");
  const [teamA, setTeamA] = useState<string[]>(["", ""]);
  const [teamB, setTeamB] = useState<string[]>(["", ""]);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const size = mode === "1v1" ? 1 : 2;

  function setName(team: "A" | "B", i: number, value: string) {
    const setter = team === "A" ? setTeamA : setTeamB;
    setter((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
    setBanner(null);
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Add Game</h1>
        <ModelPicker value={modelKey} onChange={setModelKey} />
      </div>

      <DataGate state={state}>
        {({ games, players: known }) => {
          const model = resolveModel(modelKey);
          const a = teamA.slice(0, size).map((n) => canonical(n, known));
          const b = teamB.slice(0, size).map((n) => canonical(n, known));
          const allNames = [...a, ...b];
          const filled = allNames.every((n) => n.length > 0);
          const distinct = new Set(allNames.map((n) => n.toLowerCase())).size === allNames.length;
          const newPlayers = allNames.filter((n) => !known.some((k) => k.toLowerCase() === n.toLowerCase()));

          const sa = Number(scoreA);
          const sb = Number(scoreB);
          const scoresEntered = scoreA !== "" && scoreB !== "";
          let scoreErr: string | null = null;
          if (scoresEntered) {
            try {
              validateScore(sa, sb);
            } catch (e) {
              scoreErr = e instanceof ScoreError ? e.message : String(e);
            }
          }

          // Live projected-delta preview once names + a legal score are present.
          // Cheap to compute every render (a replay over the log), and computing
          // it inline keeps us clear of the rules-of-hooks inside this callback.
          const canPreview = filled && distinct && scoresEntered && !scoreErr;
          const preview = canPreview
            ? previewGame(replay(known, games, model), a, b, sa, sb, model)
            : null;

          const canSubmit = canPreview && !busy;
          const nextId = Store.nextGameId(games);

          async function submit() {
            if (!canSubmit) return;
            setBusy(true);
            setBanner(null);
            try {
              const store = new Store(state.config);
              for (const name of newPlayers) await store.addPlayer(name);
              await store.appendGame({
                id: nextId,
                mode,
                teamA: a,
                teamB: b,
                scoreA: sa,
                scoreB: sb,
              });
              invalidateSnapshot();
              state.refresh();
              setBanner({ kind: "ok", text: `Logged game #${nextId}.` });
              setTeamA(["", ""]);
              setTeamB(["", ""]);
              setScoreA("");
              setScoreB("");
            } catch (e) {
              setBanner({ kind: "err", text: e instanceof Error ? e.message : String(e) });
            } finally {
              setBusy(false);
            }
          }

          async function undo() {
            const last = games[games.length - 1];
            if (!last) return;
            const label = `#${last.id}: ${last.teamA.join(" & ")} ${last.scoreA}–${last.scoreB} ${last.teamB.join(" & ")}`;
            if (!window.confirm(`Remove the most recent game?\n\n${label}`)) return;
            setBusy(true);
            setBanner(null);
            try {
              await new Store(state.config).deleteLastGame();
              invalidateSnapshot();
              state.refresh();
              setBanner({ kind: "ok", text: `Removed game #${last.id}. Ratings recomputed.` });
            } catch (e) {
              setBanner({ kind: "err", text: e instanceof Error ? e.message : String(e) });
            } finally {
              setBusy(false);
            }
          }

          return (
            <div className="max-w-2xl space-y-6">
              <datalist id="known-players">
                {known.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>

              {/* mode toggle */}
              <div className="inline-flex rounded-full bg-slate-800/60 p-1">
                {(["1v1", "2v2"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setBanner(null);
                    }}
                    className={[
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      mode === m ? "bg-slate-100 text-slate-900" : "text-slate-300",
                    ].join(" ")}
                  >
                    {m === "1v1" ? "1v1 (singles)" : "2v2 (doubles)"}
                  </button>
                ))}
              </div>

              {/* teams */}
              <div className="grid gap-4 sm:grid-cols-2">
                {(["A", "B"] as const).map((team) => {
                  const values = team === "A" ? teamA : teamB;
                  const score = team === "A" ? scoreA : scoreB;
                  const setScore = team === "A" ? setScoreA : setScoreB;
                  return (
                    <div key={team} className="rounded-xl bg-slate-900 p-4">
                      <div className="mb-3 text-sm font-semibold text-slate-300">
                        Team {team}
                      </div>
                      <div className="space-y-2">
                        {Array.from({ length: size }).map((_, i) => (
                          <input
                            key={i}
                            list="known-players"
                            value={values[i] ?? ""}
                            onChange={(e) => setName(team, i, e.target.value)}
                            placeholder={`Player ${i + 1}`}
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-base outline-none focus:border-slate-400"
                          />
                        ))}
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={score}
                        onChange={(e) => {
                          setScore(e.target.value);
                          setBanner(null);
                        }}
                        placeholder="Score"
                        className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-base outline-none focus:border-slate-400"
                      />
                    </div>
                  );
                })}
              </div>

              {/* inline validation hints */}
              {!distinct && filled && (
                <p className="text-sm text-amber-300">Each player can only appear once.</p>
              )}
              {scoreErr && <p className="text-sm text-amber-300">{scoreErr}</p>}
              {newPlayers.length > 0 && (
                <p className="text-sm text-slate-400">
                  New {newPlayers.length === 1 ? "player" : "players"}:{" "}
                  <span className="text-slate-200">{newPlayers.join(", ")}</span> (will be added)
                </p>
              )}

              {/* live preview */}
              {preview && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="mb-2 text-sm font-semibold text-slate-300">
                    Projected ({model.label})
                  </div>
                  <ul className="space-y-1 text-sm">
                    {Object.entries(preview).map(([name, p]) => (
                      <li key={name} className="flex justify-between">
                        <span>{name}</span>
                        <span className="font-mono">
                          {fmtRating(p.before)} → {fmtRating(p.after)}{" "}
                          <span className={p.delta >= 0 ? "text-emerald-300" : "text-red-300"}>
                            ({fmtDelta(p.delta)})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {banner && (
                <div
                  className={[
                    "rounded-lg px-3 py-2 text-sm",
                    banner.kind === "ok"
                      ? "bg-emerald-900/40 text-emerald-200"
                      : "bg-red-900/40 text-red-200",
                  ].join(" ")}
                >
                  {banner.text}
                </div>
              )}

              {/* actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  className="rounded-lg bg-slate-100 px-5 py-3 font-semibold text-slate-900 active:bg-slate-300 disabled:opacity-40"
                >
                  {busy ? "Saving…" : `Log game #${nextId}`}
                </button>
                <button
                  onClick={undo}
                  disabled={busy || games.length === 0}
                  className="rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium text-slate-200 active:bg-slate-700 disabled:opacity-40"
                >
                  Undo last
                </button>
              </div>

              {/* recent games for context while logging */}
              <div className="pt-2">
                <h2 className="mb-1 text-sm font-semibold text-slate-300">Recent games</h2>
                <RecentGames games={games} count={10} />
              </div>
            </div>
          );
        }}
      </DataGate>
    </section>
  );
}
