import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Bar, Doughnut } from "react-chartjs-2";
import { baseOptions, CHART_COLORS } from "@/lib/chartSetup";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  fetchUserDashboard,
  formatINR,
  MONTHS,
  onDataChanged,
  deleteExpense,
  deleteMonthData,
  type PersonalDashboardData,
  type PersonalMonthlyTransaction,
} from "@/lib/api";


export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ExpenseVision" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const uid = user?.id;
  const [dashboard, setDashboard] = useState<PersonalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [deletingMonth, setDeletingMonth] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!uid) {
        setDashboard(null);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchUserDashboard(uid, selectedYear);
        if (mounted) setDashboard(data);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    setDashboard(null);
    void load();
    const removeDataListener = onDataChanged(() => void load());
    return () => {
      mounted = false;
      removeDataListener();
    };
  }, [uid, selectedYear]);

  const currentYear = dashboard?.current_year ?? new Date().getFullYear();
  const currentMonth = dashboard?.current_month ?? new Date().getMonth() + 1;
  const currentMonthName = MONTHS[currentMonth - 1] ?? "This month";
  const highestCurrentMonthCategory = Object.entries(dashboard?.current_month_categories ?? {})
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const yearOptions = Array.from(
    new Set([
      ...Array.from({ length: 7 }, (_, index) => currentYear - 5 + index),
      ...(dashboard?.available_years ?? []),
      selectedYear,
    ]),
  ).sort((a, b) => b - a);
  const latestTransactions: PersonalMonthlyTransaction[] = dashboard?.latest ?? [];

  return (
    <AppShell title={`Welcome back, ${user?.name.split(" ")[0] ?? "User"} 👋`}>
      {error ? <div className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</div> : null}
      {!user?.id ? (
        <div className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">
          <Link to="/login" className="font-semibold underline">Log in</Link> to view your personal dashboard.
        </div>
      ) : null}

      <section className="glass mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div>
          <h2 className="font-bold">Dashboard Year</h2>
          <p className="text-xs text-muted-foreground">
            {loading ? "Loading personal data…" : "Yearly summaries and charts use this year."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold" htmlFor="dashboard-year">
          Year
          <select
            id="dashboard-year"
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
          >
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: `Total Income (${selectedYear})`, value: formatINR(dashboard?.total_income ?? 0), icon: "fa-arrow-trend-up", color: "success" },
          { label: `Total Expenses (${selectedYear})`, value: formatINR(dashboard?.total_expense ?? 0), icon: "fa-arrow-trend-down", color: "danger" },
          { label: `Total Savings (${selectedYear})`, value: formatINR(dashboard?.savings ?? 0), icon: "fa-piggy-bank", color: "primary" },
        ].map((card) => (
          <div key={card.label} className="glass card-hover rounded-2xl p-4">
            <div className={`grid h-10 w-10 place-items-center rounded-xl bg-${card.color}/15 text-${card.color}`}>
              <i className={`fa-solid ${card.icon}`} />
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">{card.label}</div>
            <div className="text-lg font-black">{card.value}</div>
          </div>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Quick to="/add-expense" icon="fa-arrow-down" label="Add Expense" tone="danger" />
        <Quick to="/add-income" icon="fa-arrow-up" label="Add Income" tone="success" />
        <Quick to="/profile" icon="fa-user" label="Profile" tone="secondary" />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">Monthly Spending ({selectedYear})</h3>
            <span className="text-xs text-muted-foreground">Click a month for details</span>
          </div>
          <div className="h-72">
            <Bar
              data={{
                labels: MONTHS.map((m) => m.slice(0, 3)),
                datasets: [{
                  label: "Expense",
                  data: dashboard?.by_month ?? Array(12).fill(0),
                  backgroundColor: (ctx: any) => {
                    const chart = ctx.chart;
                    const { ctx: c, chartArea } = chart;
                    if (!chartArea) return "#2563EB";
                    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    g.addColorStop(0, "#7C3AED"); g.addColorStop(1, "#2563EB");
                    return g;
                  },
                  borderRadius: 10,
                }],
              }}
              options={{
                ...baseOptions,
                plugins: { ...baseOptions.plugins, legend: { display: false } },
                onClick: (event: any, elements: any[], chart: any) => {
                  const chartIndex = elements[0]?.index;
                  const chartArea = chart.chartArea;
                  const clickedInPlot = chartArea
                    && event.x >= chartArea.left
                    && event.x <= chartArea.right
                    && event.y >= chartArea.top
                    && event.y <= chartArea.bottom;
                  const index = chartIndex ?? (clickedInPlot ? Math.round(chart.scales.x.getValueForPixel(event.x)) : -1);
                  if (user?.id && index >= 0 && index < MONTHS.length) {
                    navigate({
                      to: "/dashboard-month/$year/$month",
                      params: { year: String(selectedYear), month: String(index + 1) },
                    });
                  }
                },
                onHover: (event: any, elements: any[], chart: any) => {
                  const chartArea = chart.chartArea;
                  const hoveredInPlot = chartArea
                    && event.x >= chartArea.left
                    && event.x <= chartArea.right
                    && event.y >= chartArea.top
                    && event.y <= chartArea.bottom;
                  const index = elements[0]?.index ?? (hoveredInPlot ? Math.round(chart.scales.x.getValueForPixel(event.x)) : -1);
                  chart.canvas.style.cursor = user?.id && index >= 0 && index < MONTHS.length ? "pointer" : "default";
                },
              }}
            />
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-bold">By Category ({selectedYear})</h3>
          <div className="h-72">
            {Object.keys(dashboard?.categories ?? {}).length ? (
              <Doughnut
                data={{
                  labels: Object.keys(dashboard?.categories ?? {}),
                  datasets: [{ data: Object.values(dashboard?.categories ?? {}), backgroundColor: CHART_COLORS, borderWidth: 0 }],
                }}
                options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } } }}
              />
            ) : <div className="grid h-full place-items-center text-sm text-muted-foreground">No expenses for {selectedYear}.</div>}
          </div>
        </div>
      </section>

      <section className="glass mt-6 rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">This month at a glance</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{currentMonthName} {currentYear}</span>
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="rounded-lg border border-danger/40 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/10"
            >
              <i className="fa-solid fa-trash mr-2" />Delete Month Data
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Spent This Month</div>
            <div className="mt-1 text-lg font-black">{formatINR(dashboard?.month_expense ?? 0)}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Monthly Savings</div>
            <div className="mt-1 text-lg font-black">{formatINR(dashboard?.month_savings ?? 0)}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Highest Spending Category</div>
            <div className="mt-1 text-lg font-black">{highestCurrentMonthCategory}</div>
          </div>
        </div>
      </section>

      <section className="glass mt-6 rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold">Recent Transactions</h3>
          {uid ? (
            <Link
              to="/dashboard-month/$year/$month"
              params={{ year: String(currentYear), month: String(currentMonth) }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View this month →
            </Link>
          ) : null}
        </div>
        {latestTransactions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {latestTransactions.map((transaction) => (
                  <tr key={`${transaction.type}-${transaction.id}`} className="border-t border-border/60 transition hover:bg-primary/5">
                    <td className="whitespace-nowrap px-3 py-2.5">{transaction.date}</td>
                    <td className="px-3 py-2.5">{transaction.category}</td>
                    <td className="px-3 py-2.5">{transaction.description}</td>
                    <td className={`px-3 py-2.5 font-semibold ${transaction.type === "Income" ? "text-success" : "text-danger"}`}>
                      {transaction.type}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2.5 text-right font-bold ${transaction.type === "Income" ? "text-success" : "text-danger"}`}>
                      {formatINR(transaction.amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      {transaction.type === "Expense" ? (
                        <button
                          type="button"
                          aria-label={`Delete ${transaction.description}`}
                          onClick={async () => {
                            if (confirm("Delete this expense?")) {
                              await deleteExpense(transaction.id);
                            }
                          }}
                          className="rounded-lg border border-danger/40 px-2 py-1 text-danger hover:bg-danger/10"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {uid ? "No transactions yet. Start adding your expenses or income." : "Log in to view your personal transactions."}
          </p>
        )}
      </section>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Month Data</DialogTitle>
            <DialogDescription>
              Select the month whose expenses, income, and budget data you want to delete.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="delete-month">
            Month
            <select
              id="delete-month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:border-primary"
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index}>{month} {selectedYear}</option>
              ))}
            </select>
          </label>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deletingMonth}
              onClick={async () => {
                const month = MONTHS[selectedMonth];
                if (!uid || !confirm(`Are you sure you want to delete all data for ${month} ${selectedYear}? This action cannot be undone.`)) return;
                try {
                  setDeletingMonth(true);
                  setError(null);
                  await deleteMonthData(uid, selectedYear, selectedMonth + 1);
                  setDeleteDialogOpen(false);
                } catch (err) {
                  console.error(err);
                  setError(err instanceof Error ? err.message : "Unable to delete month data.");
                } finally {
                  setDeletingMonth(false);
                }
              }}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {deletingMonth ? "Deleting…" : "Delete All"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Quick({ to, icon, label, tone }: { to: string; icon: string; label: string; tone: string }) {
  return (
    <Link to={to} className="glass card-hover flex items-center gap-3 rounded-2xl p-4">
      <div className={`grid h-11 w-11 place-items-center rounded-xl bg-${tone}/15 text-${tone}`}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <div>
        <div className="text-sm font-bold">{label}</div>
        <div className="text-[11px] text-muted-foreground">Tap to open</div>
      </div>
    </Link>
  );
}
