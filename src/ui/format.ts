/** Display a rating as a whole number (mirrors the CLI's `{:.0f}`). */
export function fmtRating(rating: number): string {
  return Math.round(rating).toString();
}

/** Signed delta, whole number (e.g. "+12", "-5"). */
export function fmtDelta(delta: number): string {
  const r = Math.round(delta);
  return `${r >= 0 ? "+" : ""}${r}`;
}
