import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicNav, Logo } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ExpenseVision — Smart Expense Tracking & Financial Analytics" },
      { name: "description", content: "Track expenses, manage budgets and analyse spending patterns with a modern fintech-grade dashboard." },
    ],
  }),
  component: Home,
});

const STATS = [
  { label: "Users", value: "20", icon: "fa-users" },
  { label: "Expense Records", value: "3,600+", icon: "fa-receipt" },
  { label: "Categories", value: "12", icon: "fa-layer-group" },
  { label: "Income Records", value: "400+", icon: "fa-hand-holding-dollar" },
  { label: "Budget Records", value: "240", icon: "fa-piggy-bank" },
];

const FEATURES = [
  { icon: "fa-receipt", title: "Expense Tracking", desc: "Log daily expenses with category, merchant and payment mode." },
  { icon: "fa-piggy-bank", title: "Budget Management", desc: "Set monthly budgets and monitor utilisation in real time." },
  { icon: "fa-hand-holding-dollar", title: "Income Tracking", desc: "Track all income sources — salary, freelance, investments." },
  { icon: "fa-chart-line", title: "Interactive Analytics", desc: "Drill down from year → month → category → merchant." },
  { icon: "fa-store", title: "Merchant Analysis", desc: "Understand where your money actually goes." },
  { icon: "fa-lightbulb", title: "Smart Insights", desc: "SQL-driven recommendations to improve savings." },
  { icon: "fa-credit-card", title: "Payment Analysis", desc: "UPI vs Cash vs Card — visualised as pie charts." },
  { icon: "fa-chart-pie", title: "Charts & Reports", desc: "Beautiful animated charts powered by Chart.js." },
];

const TECH = ["Python","Flask","MySQL","HTML","CSS","JavaScript","Bootstrap","Chart.js"];

function Home() {
  return (
    <div className="min-h-screen">
      <div className="bg-gradient-mesh pointer-events-none fixed inset-0 -z-10 opacity-70" />
      <div className="px-3 pt-4">
        <PublicNav />
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="animate-fade-in">
            <div className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium">
              <span className="bg-success h-2 w-2 animate-pulse rounded-full" />
              Track Smarter • Save Better • Spend Wisely
            </div>
            <h1 className="text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Smart <span className="text-gradient-brand">Expense</span><br />Tracking System
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Track your expenses, manage your budget, analyse spending patterns and make smarter financial decisions — all in one beautifully crafted dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="bg-gradient-brand rounded-full px-6 py-3 text-sm font-semibold text-white shadow-elegant transition hover:scale-105">
                <i className="fa-solid fa-right-to-bracket mr-2" />Login
              </Link>
              <Link to="/register" className="glass rounded-full px-6 py-3 text-sm font-semibold transition hover:scale-105">
                <i className="fa-solid fa-user-plus mr-2" />Register
              </Link>
              <Link to="/analytics" className="rounded-full border-2 border-primary/30 px-6 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10">
                <i className="fa-solid fa-chart-line mr-2" />Explore Analytics
              </Link>
            </div>
          </div>

          {/* Illustration */}
          <div className="relative animate-scale-in">
            <div className="bg-gradient-brand absolute -inset-6 rounded-[3rem] opacity-20 blur-3xl" />
            <div className="glass relative rounded-3xl p-6 shadow-elegant">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Total Balance</div>
                  <div className="text-3xl font-black">₹1,24,580</div>
                </div>
                <Logo size={48} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-success/15 p-4">
                  <i className="fa-solid fa-arrow-trend-up text-success" />
                  <div className="mt-2 text-[11px] text-muted-foreground">Income</div>
                  <div className="font-bold">₹68,400</div>
                </div>
                <div className="rounded-2xl bg-danger/15 p-4">
                  <i className="fa-solid fa-arrow-trend-down text-danger" />
                  <div className="mt-2 text-[11px] text-muted-foreground">Expense</div>
                  <div className="font-bold">₹42,120</div>
                </div>
              </div>
              <div className="mt-4 flex h-24 items-end gap-2">
                {[40,65,45,80,60,90,55,72,88,50,70,95].map((h, i) => (
                  <div key={i} className="bg-gradient-brand flex-1 rounded-lg" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
                <span>Jan</span><span>Apr</span><span>Jul</span><span>Oct</span><span>Dec</span>
              </div>
            </div>
            <div className="glass animate-float absolute -right-4 -top-4 hidden rounded-2xl p-3 shadow-elegant sm:block">
              <i className="fa-solid fa-indian-rupee-sign text-secondary" />
              <span className="ml-2 text-xs font-semibold">Savings up 24%</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-5">
          {STATS.map((s) => (
            <div key={s.label} className="glass card-hover rounded-2xl p-5 text-center">
              <div className="bg-gradient-brand-soft mx-auto grid h-12 w-12 place-items-center rounded-2xl text-primary">
                <i className={`fa-solid ${s.icon}`} />
              </div>
              <div className="mt-3 text-2xl font-black">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Features</div>
          <h2 className="text-3xl font-black sm:text-4xl">Everything you need to master your money</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="glass card-hover rounded-2xl p-6" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="bg-gradient-brand grid h-12 w-12 place-items-center rounded-2xl text-white shadow-elegant">
                <i className={`fa-solid ${f.icon}`} />
              </div>
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="glass rounded-3xl p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-secondary">About the Project</div>
              <h2 className="text-3xl font-black">Built with a modern data-driven stack</h2>
              <p className="mt-4 text-muted-foreground">
                A modern expense tracking platform that helps users manage income, expenses, budgets, and financial insights through interactive dashboards and analytics.
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              {TECH.map((t) => (
                <span key={t} className="bg-gradient-brand-soft rounded-full border border-primary/20 px-4 py-2 text-sm font-semibold text-primary">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 ExpenseVision. Data Analytics Project.
          </p>
          <div className="flex items-center gap-3">
            <a href="#" aria-label="GitHub" className="glass grid h-10 w-10 place-items-center rounded-full transition hover:text-primary"><i className="fa-brands fa-github" /></a>
            <a href="#" aria-label="LinkedIn" className="glass grid h-10 w-10 place-items-center rounded-full transition hover:text-primary"><i className="fa-brands fa-linkedin" /></a>
            <a href="#" aria-label="Email" className="glass grid h-10 w-10 place-items-center rounded-full transition hover:text-primary"><i className="fa-solid fa-envelope" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
