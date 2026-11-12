import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Pie } from "react-chartjs-2";
import { baseOptions, CHART_COLORS } from "@/lib/chartSetup";
import { useEffect, useState } from "react";
import {
  fetchPersonalMonthlyDetails,
  formatINR,
  MONTHS,
  onDataChanged,
  type PersonalMonthlyDetails,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard-month/$year/$month")({
  loader: ({ params }) => {
    const year = Number(params.year);
    const month = Number(params.month);
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
      throw notFound();
    }
    return { year, month };
  },
  head: ({ loaderData }) => ({
    meta: [{
      title: loaderData
        ? `${MONTHS[loaderData.month - 1]} ${loaderData.year} — Personal Expenses`
        : "Monthly Expense Details",
    }],
  }),
  component: PersonalMonthlyDetailsPage,
  notFoundComponent: () => (
    <AppShell title="Not found">
      <p>That month is invalid. <Link to="/dashboard" className="text-primary underline">Back to dashboard</Link></p>
    </AppShell>
  ),
});

function PersonalMonthlyDetailsPage() {
  const { year, month } = Route.useLoaderData();
  const { user } = useAuth();
  const [details, setDetails] = useState<PersonalMonthlyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const monthName = MONTHS[month - 1];

  useEffect(() => {
    let mounted = true;
    setDetails(null);
    setError(null);
    setLoading(Boolean(user?.id));

    async function load() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const monthlyDetails = await fetchPersonalMonthlyDetails(user.id, year, month);
        if (mounted) setDetails(monthlyDetails);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load monthly details.");
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
  }, [month, user?.id, year]);

  const categoryEntries = Object.entries(details?.category_totals ?? {}).sort((a, b) => b[1] - a[1]);
  const totalExpenses = details?.total_expenses ?? 0;

  return (
    <AppShell title={`${monthName} ${year} — Monthly Details`}>
      <div className="mb-4">
        <Link to="/dashboard" className="glass inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold">
          <i className="fa-solid fa-arrow-left mr-2" /> Back to Dashboard
        </Link>
      </div>

      {!user?.id ? (
        <div className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">
          <Link to="/login" className="font-semibold underline">Log in</Link> to view your personal transactions.
        </div>
      ) : null}
      {loading ? <div className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">Loading monthly details…</div> : null}
      {error ? <div className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</div> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Selected month" value={`${monthName} ${year}`} />
        <SummaryCard label="Total expenses" value={formatINR(totalExpenses)} />
        <SummaryCard label="Total income" value={formatINR(details?.total_income ?? 0)} />
        <SummaryCard label="Transactions" value={String(details?.transaction_count ?? 0)} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-3 font-bold">Expenses by Category</h2>
          {categoryEntries.length ? (
            <>
              <div className="h-72">
                <Pie
                  data={{
                    labels: categoryEntries.map(([category]) => category),
                    datasets: [{
                      data: categoryEntries.map(([, amount]) => amount),
                      backgroundColor: CHART_COLORS,
                      borderWidth: 0,
                    }],
                  }}
                  options={{
                    ...baseOptions,
                    plugins: {
                      ...baseOptions.plugins,
                      legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } },
                      tooltip: {
                        ...baseOptions.plugins.tooltip,
                        callbacks: {
                          label: (item: any) => {
                            const percentage = totalExpenses > 0 ? (Number(item.raw) / totalExpenses) * 100 : 0;
                            return `${item.label}: ${formatINR(Number(item.raw))} (${percentage.toFixed(1)}%)`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
              <ul className="mt-4 space-y-2">
                {categoryEntries.map(([category, amount], index) => {
                  const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                  return (
                    <li key={category} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <span className="truncate">{category}</span>
                      </span>
                      <span className="shrink-0 font-semibold">{formatINR(amount)} <span className="text-muted-foreground">({percentage.toFixed(1)}%)</span></span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">No expenses to chart for this month.</p>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="mb-3 font-bold">Complete Transaction History</h2>
          {details?.transactions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {details.transactions.map((transaction) => (
                    <tr key={`${transaction.type}-${transaction.id}`} className="border-t border-border/60">
                      <td className="whitespace-nowrap px-3 py-2.5">{transaction.date}</td>
                      <td className="px-3 py-2.5">{transaction.category}</td>
                      <td className="px-3 py-2.5">{transaction.description}</td>
                      <td className={`px-3 py-2.5 font-semibold ${transaction.type === "Income" ? "text-success" : "text-danger"}`}>
                        {transaction.type}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2.5 text-right font-bold ${transaction.type === "Income" ? "text-success" : "text-danger"}`}>
                        {formatINR(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {user?.id ? `No transactions for ${monthName} ${year}.` : "Log in to view your transactions."}
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}
