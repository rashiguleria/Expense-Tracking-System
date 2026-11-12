import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Bar } from "react-chartjs-2";
import { baseOptions } from "@/lib/chartSetup";
import { useEffect, useState } from "react";
import { fetchUserMonthlyMerchantBreakdown, fetchUsers, formatINR, MONTHS } from "@/lib/api";

export const Route = createFileRoute("/analytics/user/$userId/month/$month/category/$category")({
  loader: ({ params }) => {
    const uid = Number(params.userId);
    const month = Number(params.month);
    const category = decodeURIComponent(params.category);
    if (!Number.isFinite(uid) || uid <= 0 || month < 0 || month > 11 || !category) throw notFound();
    return { user: { id: uid, name: `User ${uid}`, email: "" }, month, category };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.category} · ${MONTHS[loaderData.month]}` : "Merchant Analytics" }],
  }),
  component: MerchantAnalytics,
  notFoundComponent: () => (<AppShell title="Not found"><Link to="/analytics" className="text-primary underline">Back</Link></AppShell>),
});

function MerchantAnalytics() {
  const { user, month, category } = Route.useLoaderData();
  const [sortKey, setSortKey] = useState<"total" | "count" | "avg" | "highest">("total");
  const [rows, setRows] = useState<Array<{ merchant: string; total: number; count: number; avg: number; highest: number }>>([]);
  const [displayName, setDisplayName] = useState(user.name);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [breakdown, users] = await Promise.all([fetchUserMonthlyMerchantBreakdown(user.id, month), fetchUsers()]);
        if (!mounted) return;
        const merchantRows = Object.entries(breakdown).map(([merchant, total]) => ({ merchant, total, count: 1, avg: total, highest: total })).sort((a, b) => b.total - a.total);
        setRows(merchantRows);
        setDisplayName(users.find((entry) => entry.id === user.id)?.name ?? user.name);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load merchant analytics.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [user.id]);

  return (
    <AppShell title={`${category} · ${MONTHS[month]}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/analytics/user/$userId/month/$month" params={{ userId: String(user.id), month: String(month) }} className="glass rounded-full px-4 py-2 text-xs font-semibold">
          <i className="fa-solid fa-arrow-left mr-1" /> Back to {MONTHS[month]}
        </Link>
        <div className="glass rounded-full px-4 py-2 text-xs">
          <span className="text-muted-foreground">{displayName}</span>
        </div>
      </div>
      {loading ? <div className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">Loading merchant data…</div> : null}
      {error ? <div className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</div> : null}

      {rows.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center">
          <i className="fa-solid fa-inbox mb-3 text-4xl text-muted-foreground" />
          <p className="text-muted-foreground">No {category.toLowerCase()} transactions in {MONTHS[month]}.</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-5">
            <h3 className="mb-3 font-bold">Merchant-wise Spending</h3>
            <div className="h-72">
              <Bar
                data={{
                  labels: rows.map((r) => r.merchant),
                  datasets: [{
                    data: rows.map((r) => r.total),
                    backgroundColor: (ctx: any) => {
                      const chart = ctx.chart;
                      const { ctx: c, chartArea } = chart;
                      if (!chartArea) return "#7C3AED";
                      const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                      g.addColorStop(0, "#7C3AED"); g.addColorStop(1, "#2563EB");
                      return g;
                    },
                    borderRadius: 10,
                  }],
                }}
                options={{ ...baseOptions, indexAxis: "y" as const, plugins: { ...baseOptions.plugins, legend: { display: false }, tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (i: any) => formatINR(i.raw) } } } }}
              />
            </div>
          </div>

          <div className="glass mt-6 overflow-hidden rounded-2xl p-5">
            <h3 className="mb-3 font-bold">Transaction Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Merchant</th>
                    <SortH label="Transactions" active={sortKey === "count"} onClick={() => setSortKey("count")} />
                    <SortH label="Total" active={sortKey === "total"} onClick={() => setSortKey("total")} />
                    <SortH label="Average" active={sortKey === "avg"} onClick={() => setSortKey("avg")} />
                    <SortH label="Highest" active={sortKey === "highest"} onClick={() => setSortKey("highest")} />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.merchant} className="border-t border-border/60 transition hover:bg-primary/5">
                      <td className="px-3 py-2.5 font-medium">{r.merchant}</td>
                      <td className="px-3 py-2.5">{r.count}</td>
                      <td className="px-3 py-2.5 font-bold">{formatINR(r.total)}</td>
                      <td className="px-3 py-2.5">{formatINR(r.avg)}</td>
                      <td className="px-3 py-2.5">{formatINR(r.highest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function SortH({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th className="px-3 py-2">
      <button onClick={onClick} className={`inline-flex items-center gap-1 text-left uppercase tracking-wider ${active ? "text-primary" : ""}`}>
        {label} <i className={`fa-solid fa-sort text-[10px] ${active ? "text-primary" : "opacity-40"}`} />
      </button>
    </th>
  );
}
