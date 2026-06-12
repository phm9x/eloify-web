import { NavLink, Outlet } from "react-router-dom";

const NAV: { to: string; label: string }[] = [
  { to: "/board", label: "Board" },
  { to: "/log", label: "Log Game" },
  { to: "/players", label: "Players" },
  { to: "/history", label: "History" },
  { to: "/odds", label: "Odds" },
  { to: "/last", label: "Last" },
  { to: "/models", label: "Models" },
  { to: "/settings", label: "Settings" },
];

export function App() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2 py-3">
            <span className="text-xl font-bold tracking-tight">🏓 Eloify</span>
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto pb-2">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "bg-slate-800/60 text-slate-300 active:bg-slate-700",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
    </div>
  );
}
