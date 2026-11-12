import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Bar, Doughnut, Pie } from "react-chartjs-2";
import { baseOptions, CHART_COLORS } from "@/lib/chartSetup";
import { useEffect, useState } from "react";
import { fetchBudgetStatus, fetchFavoriteCategory, fetchUserInsights, fetchUserYearlyCategoryBreakdown, fetchUserPaymentModes, fetchUserSummary, fetchUserYearlyExpenses, fetchUsers, formatINR, MONTHS, onDataChanged, type InsightCard } from "@/lib/api";

export const Route = createFileRoute("/analytics/user/$userId")({
  loader: ({ params }) => {
    const uid = Number(params.userId);
    if (!Number.isFinite(uid) || uid <= 0) throw notFound();
    return { user: { id: uid, name: `User ${uid}`, email: "" } };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.user.name} — User Analytics` : "User Analytics" }],
  }),
  component: UserAnalytics,
  notFoundComponent: () => (
    <AppShell title="User not found"><p>That user doesn't exist. <Link to="/analytics" className="text-primary underline">Back to analytics</Link></p></AppShell>
  ),
});

function UserAnalytics() {
  const { user } = Route.useLoaderData();
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0, savings: 0, budget: 0, remaining_budget: 0 });
  const [yearlyExpenses, setYearlyExpenses] = useState<number[]>(Array(12).fill(0));
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [paymentModes, setPaymentModes] = useState<Record<string, number>>({});
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [favoriteCategory, setFavoriteCategory] = useState("—");
  const [budgetStatus, setBudgetStatus] = useState({ budget: 0, total_expense: 0, remaining_budget: 0, budget_used: 0, status: "On track" });
  const [userNameMap, setUserNameMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [summaryData, yearly, categories, payment, insightCards, favorite, budget, users] = await Promise.all([
          fetchUserSummary(user.id),
          fetchUserYearlyExpenses(user.id),
          fetchUserYearlyCategoryBreakdown(user.id),
          fetchUserPaymentModes(user.id),
          fetchUserInsights(user.id),
          fetchFavoriteCategory(user.id),
          fetchBudgetStatus(user.id),
          fetchUsers(),
        ]);
        if (!mounted) return;
        setSummary(summaryData);
        setYearlyExpenses(yearly.length ? yearly : Array(12).fill(0));
        setCategoryBreakdown(categories);
        setPaymentModes(payment);
        setInsights(insightCards);
        setFavoriteCategory(favorite);
        setBudgetStatus(budget);
        setUserNameMap(Object.fromEntries(users.map((entry) => [entry.id, entry.name])));
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load user analytics.");
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
  }, [user.id]);

  const highestExpense = Math.max(...yearlyExpenses, 0);
  const averageMonthlyExpense = summary.total_expense / 12;
  const expenseToIncome = summary.total_income ? summary.total_expense / summary.total_income : 0;
  const topMonthIndex = yearlyExpenses.reduce((bestIndex, value, index, arr) => (value > arr[bestIndex] ? index : bestIndex), 0);
  const lowMonthIndex = yearlyExpenses.reduce((bestIndex, value, index, arr) => (value < arr[bestIndex] ? index : bestIndex), 0);
  const budgetPct = Math.min(100, budgetStatus.budget_used);
  const overBudget = budgetStatus.budget_used > 100 || budgetStatus.total_expense > budgetStatus.budget;
  const displayName = userNameMap[user.id] ?? user.name;
  const preferredPayment = Object.entries(paymentModes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const topCategory = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const cards = [
    { label: "Total Income", value: formatINR(summary.total_income), icon: "fa-arrow-trend-up", tone: "success" },
    { label: "Total Expense", value: formatINR(summary.total_expense), icon: "fa-arrow-trend-down", tone: "danger" },
    { label: "Savings", value: formatINR(summary.savings), icon: "fa-piggy-bank", tone: "primary" },
    { label: "Budget (Yearly)", value: formatINR(summary.budget), icon: "fa-wallet", tone: "secondary" },
    { label: "Avg Month Expense", value: formatINR(averageMonthlyExpense), icon: "fa-calendar", tone: "warning" },
    { label: "Highest Expense", value: formatINR(highestExpense), icon: "fa-fire", tone: "warning" },
    { label: "Favorite Category", value: favoriteCategory, icon: "fa-layer-group", tone: "warning" },
    { label: "Expense/Income", value: `${expenseToIncome.toFixed(2)}x`, icon: "fa-balance-scale", tone: "primary" },
    { label: "Preferred Payment", value: preferredPayment, icon: "fa-credit-card", tone: "success" },
    { label: "Budget Status", value: overBudget ? "Exceeded" : "On track", icon: overBudget ? "fa-triangle-exclamation" : "fa-check", tone: overBudget ? "danger" : "success" },
  ];

  const insightCards: { title: string; text: string; tone: string }[] = insights.length
    ? insights.map((item) => ({ title: item.title, text: item.text, tone: item.tone ?? "primary" }))
    : [
        { title: "Highest Spending Category", text: `${topCategory} is the main driver of spend.`, tone: "danger" },
        { title: "Budget Status", text: overBudget ? "You have crossed the budget — review discretionary spending." : "Spending is within budget for this period.", tone: overBudget ? "danger" : "success" },
      ];

  return (
    <AppShell title={`Analytics — ${displayName}`}>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/analytics" className="glass rounded-full px-4 py-2 text-xs font-semibold"><i className="fa-solid fa-arrow-left mr-1" /> Back to overview</Link>
        <div className="text-xs text-muted-foreground">{displayName}</div>
      </div>
      {loading ? <div className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">Loading analytics…</div> : null}
      {error ? <div className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</div> : null}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="glass card-hover rounded-2xl p-4">
            <div className={`grid h-10 w-10 place-items-center rounded-xl bg-${c.tone}/15 text-${c.tone}`}>
              <i className={`fa-solid ${c.icon}`} />
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className="truncate text-base font-black">{c.value}</div>
          </div>
        ))}
      </section>

      <section className="glass mt-6 rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Monthly Spending — click any month</h3>
          <span className="text-xs text-muted-foreground">Live backend data</span>
        </div>
        <div className="h-80">
          <Bar
            data={{
              labels: MONTHS,
              datasets: [{
                label: "Spend",
                data: yearlyExpenses,
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
              plugins: { ...baseOptions.plugins, legend: { display: false }, tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (item: any) => formatINR(item.raw) } } },
              onClick: (_e: any, els: any[]) => {
                if (els.length) {
                  const idx = els[0].index;
                  window.location.href = `/analytics/user/${user.id}/month/${idx}`;
                }
              },
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => { window.location.href = `/analytics/user/${user.id}/month/${i}`; }}
              className="glass rounded-full px-3 py-1 text-xs font-semibold hover:bg-primary/10 hover:text-primary"
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      </section>

      <section className="glass mt-6 rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Budget Analysis</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${overBudget ? "bg-danger/15 text-danger" : "bg-success/15 text-success"}`}>
            {budgetStatus.budget_used.toFixed(1)}% used
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Budget" value={formatINR(budgetStatus.budget)} />
          <Stat label="Actual Spending" value={formatINR(budgetStatus.total_expense)} />
          <Stat label="Remaining" value={formatINR(budgetStatus.remaining_budget)} />
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${overBudget ? "bg-danger" : "bg-gradient-brand"}`} style={{ width: `${budgetPct}%` }} />
        </div>
        {overBudget ? <div className="mt-3 rounded-xl bg-danger/10 p-3 text-sm text-danger"><i className="fa-solid fa-triangle-exclamation mr-2" />Budget exceeded — review discretionary spending.</div> : null}
      </section>

      <section className="glass mt-6 rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Spending rhythm</h3>
          <span className="text-xs text-muted-foreground">Highlights from the yearly trend</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Peak month" value={MONTHS[topMonthIndex] ?? "—"} />
          <MiniStat label="Lowest month" value={MONTHS[lowMonthIndex] ?? "—"} />
          <MiniStat label="Top category" value={topCategory} />
          <MiniStat label="Preferred payment" value={preferredPayment} />
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-bold">Payment Analytics</h3>
          <div className="h-72">
            <Pie
              data={{ labels: Object.keys(paymentModes), datasets: [{ data: Object.values(paymentModes), backgroundColor: ["#2563EB", "#7C3AED", "#10B981"], borderWidth: 0 }] }}
              options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { position: "bottom" }, tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (item: any) => `${item.label}: ${formatINR(item.raw)}` } } } }}
            />
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-bold">Category Analysis (yearly)</h3>
          <div className="h-72">
            <Doughnut
              data={{ labels: Object.keys(categoryBreakdown), datasets: [{ data: Object.values(categoryBreakdown), backgroundColor: CHART_COLORS, borderWidth: 0 }] }}
              options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } } }}
            />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="mb-3 text-lg font-bold">Smart Insights & Recommendations</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insightCards.map((i) => (
            <div key={i.title} className="glass card-hover rounded-2xl border-l-4 border-primary p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">{i.title}</div>
              <p className="mt-1 text-sm text-foreground/80">{i.text}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  );
}
