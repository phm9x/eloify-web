# Eloify feature & behavior reference (CLI → web)

Distilled from the Python CLI (`eloify/src/eloify/`), this is the source of truth for the
web rewrite's `core/*` port. Behavior here must be reproduced exactly — the two apps stay
in sync only through the shared Google Sheet, and the Vitest port is expected to match the
Python results on the same fixtures.

## What eloify is
An office ping-pong ELO tracker. Players log 1v1 and 2v2 games; ratings are derived by
replaying the whole game log under a pluggable rating model. Nothing is stored mutably —
every read recomputes ratings from scratch, so changing the model or deleting a game just
changes the replay.

## Data model (the shared Google Sheet)
Two worksheets, located by gid. The web app reads/writes the same schema.

**Games** — headers `id, played_at, mode, team_a, team_b, score_a, score_b`
- `id`: integer; `next_game_id` = max existing id + 1 (1 if empty).
- `played_at`: ISO-8601 UTC, seconds precision (e.g. `2026-06-12T14:03:00+00:00`).
- `mode`: `"1v1"` or `"2v2"`.
- `team_a` / `team_b`: player names joined with `", "` (one name for singles, two for doubles).
- `score_a` / `score_b`: integers; first column maps to the team listed first.

**Players** — headers `name, created_at`
- `name`: display name (canonical). `created_at`: ISO-8601 UTC.
- `player_names()` = trimmed, non-empty names from this sheet.

Writes: append a row to Games (`USER_ENTERED`); append to Players; undo = delete the last
Games data row. Headers are written once into empty tabs (`init`/`ensure_headers`).

## Rating engine (`core/elo.ts`, `core/engine.ts`)
Constants: `START_RATING = 1000.0`, base `K = 24.0`.

**Primitives**
- `expected(rA, rB) = 1 / (1 + 10 ** ((rB - rA) / 400))` — A's expected score 0..1.
- `mov_multiplier(margin, winner, loser) = ln(|margin| + 1) * (2.2 / ((winner - loser) * 0.001 + 2.2))`
  — margin-of-victory K multiplier; the rating-gap term damps autocorrelation (heavy
  favorites winning big gain less; upsets are amplified).
- `compute_deltas(rA, rB, sA, sB, k=K)` → `(deltaA, deltaB=-deltaA)` for the MoV model.
- `projected_score(winProb, target=21)` → `(favoritePts, underdogPts)`. Favorite reaches
  `target`; underdog = `round(target * (1-fav)/fav)` capped at `target - 2`.

**Team handling**: a team's rating is the **mean** of its players' ratings. The computed
delta is shared across teammates — except the provisional model, which applies a per-player
K (so teammates can move by different amounts).

**Models** (pluggable registry; `get_model` accepts a key or a 1-based number; default first):
| key | label | behavior |
|-----|-------|----------|
| `mov` | Margin-of-victory ELO | Logistic ELO, K scaled by score margin. |
| `elo` | Plain ELO | Classic logistic ELO, K=24, margin ignored — a win is a win. |
| `provisional` | Provisional-K ELO | **DEFAULT.** MoV ELO with K=40 for a player's first 10 games, then K=24. Per-player K. |
| `share` | Score-share ELO | Outcome = share of points won (`scoreA/total`), not 1/0 — a close loss can still gain rating. |

Default model = `provisional` (overridable via `ELOIFY_MODEL` in the CLI; web uses a model
picker remembered in `localStorage`). `all_models()` lists default-first then registration
order; that order is the stable `--model N` number.

**Replay & derived views** (`engine`)
- `replay(names, games, model)` → `name → PlayerStats` (final ratings) by applying games in order.
- `apply_game(stats, game, model)` mutates stats in place, returns `name → delta`; increments
  games/wins/losses (winner = higher score).
- `replay_modes(...)` → `{ overall, singles, doubles }`, each an **independent** replay over
  the full / `1v1`-only / `2v2`-only games. A player's singles rating is unaffected by doubles.
- `leaderboard(stats)` sorts by `(-rating, -games, name.lower())`.
- `preview_game(stats, teamA, teamB, sA, sB, model)` → `name → (before, after, delta)` for a
  prospective (unsaved) game — drives the Log Game live preview.
- `rating_trend(games, player, model, opponent?)` → series of ratings: the player's rating
  going in, then after each game they played (optionally filtered to games vs `opponent`).
  Ratings still evolve through every game; `opponent` only filters which points are recorded.
  Returns `[]` if no matching game.
- `match_candidates(token, known)` — fuzzy name match, preferring exact > prefix > substring;
  returns all hits at the best tier. (Web: a `<datalist>` of names; free text → new player.)

**PlayerStats**: `{ name, rating=1000, wins, losses, games }`, `win_pct = wins/games*100`.

## Score validation (`core/validate.ts`)
Targets `{11, 21}`, `MAX_DEUCES = 6`. A result `(w > l)` is legal if some target T satisfies:
- clean win: `w == T and l <= T - 2`, **or**
- deuce: `w == l + 2 and l >= T - 1 and w <= T + MAX_DEUCES`.

So the largest legal results are **17-15** (to 11) and **27-25** (to 21). Ties and negatives
are illegal. `validate_score` throws a `ScoreError` with a user-facing message.

## Add grammar (CLI only — web uses a form)
Positional: `elo add duncan peter 21 18` (1v1) · `elo add a b c d 21 15` (2v2). Trailing
integers are the two scores; everything before is names (2 → 1v1, 4 → 2v2, grouped 2-and-2).
Optional `vs` / `v` / `/` / `|` separator splits the teams. The web app replaces this with a
1v1/2v2 toggle + name fields, so the parser itself need not be ported — only the resulting
game shape and the same validation.

## Commands → web screens
| CLI command | Web screen | Notes |
|-------------|------------|-------|
| `add` | **Log Game** | 1v1/2v2 toggle, name datalist, live projected-delta preview, append → refresh. |
| `board [overall\|singles\|doubles]` `--top N` | **Board** | Overall view shows singles/doubles columns; filtered views rank by that mode. Model selector remembered in `localStorage`. |
| `players` | **Players** | Registered players + current ELO. |
| `history NAME [OPP]` `--no-graph` | **History** | Recent games + SVG sparkline of rating over time; optional head-to-head. |
| `odds NAME OPP` | **Odds** | Win probability + projected score, both players' trend sparklines. |
| `last [N]` | **Last N** | Last N games (default 5), winner highlighted. |
| `models` | **Models** | List the rating models. |
| `set-headshot` / `headshot` | Headshots | **Setting a headshot stays CLI-only** (needs image tooling + a commit). Web only *renders* committed art. |
| `undo` | (Log Game / Board action) | Remove the most recent game; ratings recompute. |
| `init` | one-time | Write header rows to empty tabs. |

## Headshots
The CLI renders player avatars as committed ASCII/braille art (`.txt` under the package
assets, generated from a cropped photo with image tooling, then committed). The web app
renders that committed braille in a monospace `<pre>` and shows a placeholder when none
exists — generating new headshots remains a CLI-only operation.

## Charts
The CLI draws a box-drawing line chart for rating trends (`chart.py`, downsampled to ≤60
columns). The web equivalent is a small custom **SVG sparkline** (`rating_trend` series →
polyline) — no heavy chart library.

## Notes for the port
- Recompute-from-log is the core invariant — keep ratings derived, never persisted.
- Float math must match Python (`ln`, `**`, rounding) for the Vitest fixtures to agree;
  watch `round()` half-to-even vs JS `Math.round` half-up at the seams (`projected_score`,
  chart row mapping).
- Spreadsheet ID + gids are config (web: a Settings screen persisted to `localStorage`,
  not baked in). CLI defaults live in `eloify/src/eloify/config.py`.
