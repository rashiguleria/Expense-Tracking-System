import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth, useTheme } from "@/lib/auth";
import type { ReactNode } from "react";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="bg-gradient-brand grid place-items-center rounded-2xl text-white shadow-elegant"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          <circle cx="17" cy="14" r="1.5" fill="currentColor" />
          <path d="M10 10h3M11.5 8v6" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-base font-extrabold tracking-tight">
          <span className="text-gradient-brand">Expense</span>Vision
        </div>
        <div className="text-[10px] text-muted-foreground -mt-0.5">Smart Analytics</div>
      </div>
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="glass grid h-10 w-10 place-items-center rounded-full transition hover:scale-105"
      aria-label="Toggle theme"
    >
      <i className={`fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"} text-foreground`} />
    </button>
  );
}

export function PublicNav() {
  const { user } = useAuth();
  return (
    <nav className="glass sticky top-4 z-40 mx-auto flex max-w-6xl items-center justify-between rounded-full px-5 py-2.5 shadow-soft">
      <Link to="/"><Logo /></Link>
      <div className="hidden items-center gap-1 md:flex">
        {[
          { to: "/", label: "Home" },
          { to: "/dashboard", label: "Dashboard" },
          { to: "/analytics", label: "Demo Analytics" },
        ].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-primary/10 hover:text-primary"
            activeProps={{ className: "bg-primary/10 text-primary" }}
            activeOptions={{ exact: true }}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user ? (
          <Link to="/dashboard" className="bg-gradient-brand rounded-full px-4 py-2 text-sm font-semibold text-white shadow-elegant">
            Get Started
          </Link>
        ) : (
          <>
            <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium hover:text-primary">Login</Link>
            <Link to="/register" className="bg-gradient-brand rounded-full px-4 py-2 text-sm font-semibold text-white shadow-elegant hover:opacity-95">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

const APP_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: "fa-house" },
  { to: "/analytics", label: "Analytics", icon: "fa-chart-line" },
  { to: "/add-expense", label: "Add Expense", icon: "fa-arrow-down" },
  { to: "/add-income", label: "Add Income", icon: "fa-arrow-up" },
  { to: "/profile", label: "Profile", icon: "fa-user" },
];

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-mesh pointer-events-none fixed inset-0 -z-10 opacity-60" />
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="glass sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 border-r p-4 md:flex">
          <Link to="/" className="mb-4"><Logo /></Link>
          <nav className="flex flex-col gap-1">
            {APP_LINKS.map((l) => {
              const active = pathname === l.to || (l.to === "/analytics" && pathname.startsWith("/analytics"));
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-gradient-brand text-white shadow-elegant" : "text-foreground/80 hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <i className={`fa-solid ${l.icon} w-5 text-center`} />
                  <span>{l.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto">
            <button
              onClick={() => { logout(); navigate({ to: "/" }); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger transition hover:bg-danger/10"
            >
              <i className="fa-solid fa-right-from-bracket w-5 text-center" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1">
          <header className="glass sticky top-0 z-30 flex items-center justify-between border-b px-5 py-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Dashboard</div>
              <h1 className="truncate text-lg font-bold sm:text-xl">{title ?? "Overview"}</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user && (
                <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5">
                  <div className="bg-gradient-brand grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
                </div>
              )}
            </div>
          </header>

          {/* Mobile bottom nav */}
          <nav className="glass fixed bottom-3 left-3 right-3 z-40 flex items-center justify-around rounded-full px-2 py-2 shadow-elegant md:hidden">
            {APP_LINKS.map((l) => {
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`grid h-10 w-10 place-items-center rounded-full text-sm transition ${
                    active ? "bg-gradient-brand text-white" : "text-foreground/70"
                  }`}
                  aria-label={l.label}
                >
                  <i className={`fa-solid ${l.icon}`} />
                </Link>
              );
            })}
          </nav>

          <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 md:pb-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
