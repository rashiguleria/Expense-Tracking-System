import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Bar } from "react-chartjs-2";
import { baseOptions } from "@/lib/chartSetup";
import { useEffect, useState } from "react";
import { fetchDashboard, fetchUsers, fetchUserExpenses, formatINR, onDataChanged } from "@/lib/api";

export const Route = createFileRoute("/analytics/")({
  head: () => ({ meta: [{ title: "Demo Analytics — ExpenseVision" }] }),
  component: DemoAnalytics,
});

function DemoAnalytics() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({ total_users: 0, total_expense: 0, total_income: 0, average_expense: 0, highest_spender_name: "—", highest_spender_total: 0 });
  const [users, setUsers] = useState([] as Array<{ id: number; name: string; email: string }>);
  const [userExpenses, setUserExpenses] = useState([] as Array<{ user_id: number; total_expense: number; name?: string }>);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [summary, responseUsers, expenses] = await Promise.all([fetchDashboard(), fetchUsers(), fetchUserExpenses()]);
        if (!mounted) return;
        setDashboard(summary);
        setUsers(responseUsers);
        setUserExpenses(expenses);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load analytics.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    const removeDataListener = onDataChanged(() => void load());
    return () => {
      mounted = false;
      removeDataListener();
    };
  }, []);

  const sortedSpend = [...userExpenses].sort((a, b) => b.total_expense - a.total_expense);
  const avgSpendPerUser = dashboard.total_users ? dashboard.total_expense / dashboard.total_users : 0;

  const cards = [
    { label: "Total Registered Users", value: "20+", icon: "fa-users", tone: "primary" },
    { label: "Highest Spender", value: dashboard.highest_spender_name || "—", subValue: dashboard.highest_spender_total ? formatINR(dashboard.highest_spender_total) : "—", icon: "fa-crown", tone: "warning" },
    { label: "Average Spending per User", value: formatINR(avgSpendPerUser), icon: "fa-chart-simple", tone: "secondary" },
  ];

  return (
    <AppShell title="Demo Analytics">
      {loading ? <div className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">Loading analytics…</div> : null}
      {error ? <div className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</div> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="glass card-hover rounded-2xl p-4">
            <div className={`grid h-10 w-10 place-items-center rounded-xl bg-${c.tone}/15 text-${c.tone}`}>
              <i className={`fa-solid ${c.icon}`} />
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className="break-words text-lg font-black">{c.value}</div>
            {c.subValue ? <div className="mt-1 text-xs text-muted-foreground">{c.subValue}</div> : null}
          </div>
        ))}
      </section>

      <section className="glass mt-6 rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold">Overall User Spending</h3>
          <span className="text-xs text-muted-foreground">Click a bar to open a user analytics page</span>
        </div>
        <div className="h-96">
          <Bar
            data={{
              labels: userExpenses.map((entry) => entry.name ?? `User ${entry.user_id}`),
              datasets: [{
                label: "Total Spend",
                indexAxis: "x",
                data: userExpenses.map((entry) => entry.total_expense),
                backgroundColor: (ctx: any) => {
                  const chart = ctx.chart;
                  const { ctx: c, chartArea } = chart;
                  if (!chartArea) return "#2563EB";
                  const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                  g.addColorStop(0, "#7C3AED"); g.addColorStop(1, "#2563EB");
                  return g;
                },
                borderRadius: 8,
              }],
            }}
            options={{
              ...baseOptions,
              indexAxis: "x",
              scales: {
                x: {
                  ticks: { autoSkip: false, maxRotation: 60, minRotation: 30 },
                },
                y: {
                  beginAtZero: true,
                  ticks: { callback: (value: string | number) => formatINR(Number(value)) },
                },
              },
              plugins: {
                ...baseOptions.plugins,
                legend: { display: false },
                tooltip: {
                  ...baseOptions.plugins.tooltip,
                  callbacks: {
                    title: (items: any) => userExpenses[items[0].dataIndex]?.name ?? "",
                    label: (item: any) => `Total: ${formatINR(item.raw)}`,
                  },
                },
              },
              onClick: (_e: any, els: any[]) => {
                if (els.length) {
                  const idx = els[0].index;
                  const uid = userExpenses[idx]?.user_id;
                  if (uid) navigate({ to: "/analytics/user/$userId", params: { userId: String(uid) } });
                }
              },
            }}
          />
        </div>
      </section>

      <section className="glass mt-6 rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Top 3 Spenders</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {sortedSpend.slice(0, 3).map((entry, index) => (
            <div key={`${entry.user_id}-${index}`} className="rounded-2xl border border-border/60 bg-background/50 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">#{index + 1}</div>
              <div className="mt-1 font-semibold">{entry.name ?? `User ${entry.user_id}`}</div>
              <div className="text-sm font-black text-danger">{formatINR(entry.total_expense)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass mt-6 rounded-2xl p-5">
        <h3 className="mb-3 font-bold">All Registered Users</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {users.map((u) => (
            <Link key={u.id} to="/analytics/user/$userId" params={{ userId: String(u.id) }} className="glass card-hover flex items-center gap-2 rounded-xl p-2.5">
              <div className="bg-gradient-brand grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white">{u.id}</div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{u.name}</div>
                <div className="text-[10px] text-muted-foreground">View →</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
