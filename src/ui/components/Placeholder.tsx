interface PlaceholderProps {
  title: string;
  note: string;
}

/** Stand-in for screens wired up in later build-order steps (2–4). */
export function Placeholder({ title, note }: PlaceholderProps) {
  return (
    <section>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-3 max-w-prose text-slate-400">{note}</p>
      <p className="mt-6 text-sm text-slate-500">
        Coming in a later build step. Configure the sheet in{" "}
        <span className="font-medium text-slate-300">Settings</span> first.
      </p>
    </section>
  );
}
