// Renders a player's committed braille/ASCII avatar in a monospace block, or a
// placeholder initial when none exists. Setting a headshot stays CLI-only (it
// needs image tooling + a commit), so the web app only *renders* committed art.
//
// The art lives as text in the CLI package assets; until those are bundled or
// served, `art` is undefined and every player shows the placeholder. Wiring the
// real art source is a follow-up (see docs/eloify-features.md → Headshots).

interface HeadshotProps {
  name: string;
  art?: string;
  size?: number;
}

export function Headshot({ name, art, size = 64 }: HeadshotProps) {
  if (art) {
    return (
      <pre
        className="font-mono leading-none text-slate-300"
        style={{ fontSize: 6 }}
        aria-label={`${name} headshot`}
      >
        {art}
      </pre>
    );
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex items-center justify-center rounded-full bg-slate-800 font-semibold text-slate-400"
      style={{ width: size, height: size }}
      aria-label={`${name} (no headshot)`}
    >
      {initial}
    </div>
  );
}
