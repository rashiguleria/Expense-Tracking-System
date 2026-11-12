import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Bar, Doughnut, Pie } from "react-chartjs-2";
import { baseOptions, CHART_COLORS } from "@/lib/chartSetup";
import { useEffect, useState } from "react";
import { fetchBudgetStatus, fetchUserAnalyticsYear, fetchUserInsights, fetchUserMonthlyCategoryBreakdownForYear, fetchUserMonthlyMerchantBreakdown, fetchUserMonthlyPaymentModes, fetchUserTransactions, fetchUsers, formatINR, MONTHS, onDataChanged, type InsightCard, type RecentTransaction } from "@/lib/api";

export const Route = createFileRoute("/analytics/user/$userId/month/$month")({
  loader: ({ params }) => {
    const uid = Number(params.userId);
    const month = Number(params.month);
    if (!Number.isFinite(uid) || uid <= 0 || month < 0 || month > 11) throw notFound();
    return { user: { id: uid, name: `User ${uid}`, email: "" }, month };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${MONTHS[loaderData.month]} — ${loaderData.user.name}` : "Monthly Analytics" }],
  }),
  component: MonthlyAnalytics,
  notFoundComponent: () => (<AppShell title="Not found"><Link to="/analytics" className="text-primary underline">Back</Link></AppShell>),
});

function MonthlyAnalytics() {
  const { user, month } = Route.useLoaderData();
  const [cats, setCats] = useState<Record<string, number>>({});
  const [merchants, setMerchants] = useState<Record<string, number>>({});
  const [paymentModes, setPaymentModes] = useState<Record<string, number>>({});
  const [budget, setBudget] = useState({ budget: 0, total_expense: 0 });
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [displayName, setDisplayName] = useState(user.name);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsYear, setAnalyticsYear] = useState(new Date().getFullYear());

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const year = await fetchUserAnalyticsYear(user.id);
        const [breakdown, merchantBreakdown, paymentBreakdown, budgetStatus, insightCards, transactionRows, users] = await Promise.all([
          fetchUserMonthlyCategoryBreakdownForYear(user.id, month, year),
          fetchUserMonthlyMerchantBreakdown(user.id, month),
          fetchUserMonthlyPaymentModes(user.id, month),
          fetchBudgetStatus(user.id),
          fetchUserInsights(user.id),
          fetchUserTransactions(user.id),
          fetchUsers(),
        ]);
        if (!mounted) return;
        setCats(breakdown);
        setAnalyticsYear(year);
        setMerchants(merchantBreakdown);
        setPaymentModes(paymentBreakdown);
        setBudget(budgetStatus);
        setInsights(insightCards);
        setTransactions(transactionRows.filter((entry) => entry.date?.slice(5, 7) === String(month + 1).padStart(2, "0")).slice(0, 8));
        setDisplayName(users.find((entry) => entry.id === user.id)?.name ?? user.name);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load monthly analytics.");
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
  }, [month, user.id]);

  const categoryEntries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const merchantEntries = Object.entries(merchants).sort((a, b) => b[1] - a[1]);
  const total = categoryEntries.reduce((sum, [, value]) => sum + value, 0);
  const topCategory = categoryEntries[0]?.[0] ?? "—";
  const topMerchant = merchantEntries[0]?.[0] ?? "—";

  return (
    <AppShell title={`${MONTHS[month]} ${analyticsYear} · ${displayName}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/analytics/user/$userId" params={{ userId: String(user.id) }} className="glass rounded-full px-4 py-2 text-xs font-semibold">
          <i className="fa-solid fa-arrow-left mr-1" /> Back to yearly
        </Link>
        <div className="glass rounded-full px-4 py-2 text-xs">
          <span className="text-muted-foreground">Month total:</span> <span className="font-bold">{formatINR(total)}</span>
        </div>
      </div>
      {loading ? <div className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">Loading monthly breakdown…</div> : null}
      {error ? <div className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</div> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Month spend</div>
          <div className="mt-1 text-lg font-black">{formatINR(total)}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Top category</div>
          <div className="mt-1 text-lg font-black">{topCategory}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Top merchant</div>
          <div className="mt-1 text-lg font-black">{topMerchant}</div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-bold">Monthly Spending — Bar</h3>
          <div className="h-80">
            <Bar
              data={{
                labels: categoryEntries.map(([name]) => name),
                datasets: [{
                  data: categoryEntries.map(([, value]) => value),
                  backgroundColor: CHART_COLORS,

                  
                  borderRadius: 8,
                }],
              }}
              options={{
                ...baseOptions,
                plugins: { ...baseOptions.plugins, legend: { display: false }, tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (i: any) => formatINR(i.raw) } } },
                onClick: (_e: any, els: any[]) => {
                  if (els.length) {
                    const idx = els[0].index;
                    const cat = categoryEntries[idx]?.[0];
                    if (cat) window.location.href = `/analytics/user/${user.id}/month/${month}/category/${encodeURIComponent(cat)}`;
                  }
                },
              }}
            />
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-bold">Category Split — Pie</h3>
          <div className="h-80">
            <Doughnut
              data={{ labels: categoryEntries.map(([name]) => name), datasets: [{ data: categoryEntries.map(([, value]) => value), backgroundColor: CHART_COLORS, borderWidth: 0 }] }}
              options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } } }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-bold">Merchant-wise Spending — Bar</h3>
          <div className="h-80">
            <Bar
              data={{ labels: merchantEntries.map(([name]) => name), datasets: [{ data: merchantEntries.map(([, value]) => value), backgroundColor: CHART_COLORS, borderRadius: 8 }] }}
              options={{ ...baseOptions, indexAxis: "y" as const, plugins: { ...baseOptions.plugins, legend: { display: false }, tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (i: any) => formatINR(i.raw) } } } }}
            />
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-bold">Payment Mode — Pie</h3>
          <div className="h-80">
            <Pie
              data={{ labels: Object.keys(paymentModes), datasets: [{ data: Object.values(paymentModes), backgroundColor: CHART_COLORS, borderWidth: 0 }] }}
              options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { position: "bottom" } } }}
            />
          </div>
        </div>
      </div>

      <section className="glass mt-6 rounded-2xl p-5">
        <h3 className="mb-3 font-bold">Budget vs Expense</h3>
        <div className="h-72">
          <Bar
            data={{ labels: ["Budget", "Expense"], datasets: [{ data: [budget.budget, budget.total_expense], backgroundColor: ["#10B981", "#EF4444"], borderRadius: 10 }] }}
            options={{ ...baseOptions, plugins: { ...baseOptions.plugins, legend: { display: false }, tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (i: any) => formatINR(i.raw) } } } }}
          />
        </div>
      </section>

      <section className="mt-6">
        <h3 className="mb-3 text-lg font-bold">Smart Insights & Recommendations</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(insights.length ? insights : [{ title: "Monthly spending", text: `${topCategory} is the leading category this month.`, tone: "primary" }]).map((insight) => (
            <div key={insight.title} className="glass card-hover rounded-2xl border-l-4 border-primary p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">{insight.title}</div>
              <p className="mt-1 text-sm text-foreground/80">{insight.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass mt-6 rounded-2xl p-5">
        <h3 className="mb-3 font-bold">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="px-3 py-2">Date</th><th className="px-3 py-2">Merchant</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Amount</th></tr></thead>
            <tbody>{transactions.map((transaction) => <tr key={transaction.id} className="border-t border-border/60"><td className="px-3 py-2.5">{transaction.date ?? "—"}</td><td className="px-3 py-2.5">{transaction.merchant ?? "—"}</td><td className="px-3 py-2.5">{transaction.category ?? "—"}</td><td className="px-3 py-2.5 font-bold text-danger">{formatINR(transaction.amount)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="mb-3 font-bold">Category totals — click to drill into merchants</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categoryEntries.map(([c, value]) => (
            <Link key={c} to="/analytics/user/$userId/month/$month/category/$category" params={{ userId: String(user.id), month: String(month), category: c }} className="glass card-hover flex items-center justify-between rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-brand-soft grid h-9 w-9 place-items-center rounded-lg text-primary"><i className="fa-solid fa-tag text-xs" /></div>
                <span className="font-semibold">{c}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{formatINR(value ?? 0)}</div>
                <div className="text-[10px] text-muted-foreground">View merchants →</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
