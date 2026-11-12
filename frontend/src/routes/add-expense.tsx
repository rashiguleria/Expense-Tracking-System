import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CATEGORIES, PAYMENT_METHODS, postJson } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

export const Route = createFileRoute("/add-expense")({
  head: () => ({ meta: [{ title: "Add Expense — ExpenseVision" }] }),
  component: AddExpense,
});

function AddExpense() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    amount: "", category: CATEGORIES[0], merchant: "", paymentMode: PAYMENT_METHODS[0],
    date: new Date().toISOString().slice(0, 10), notes: "",
  });
  const up = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        user_id: user?.id ?? 1,
        amount: Number(f.amount),
        category: f.category,
        merchant: f.merchant,
        payment_mode: f.paymentMode,
        date: f.date,
        notes: f.notes,
      };
      await postJson("/api/expenses", payload);
      setOk(true);
      setTimeout(() => navigate({ to: "/dashboard", replace: true }), 900);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to save expense right now.");
    }
  };

  return (
    <AppShell title="Add Expense">
      <div className="mx-auto max-w-2xl">
        <div className="glass rounded-3xl p-6 shadow-elegant sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-danger/15 text-danger grid h-12 w-12 place-items-center rounded-2xl">
              <i className="fa-solid fa-arrow-down text-lg" />
            </div>
            <div>
              <h2 className="text-xl font-black">Log a new expense</h2>
              <p className="text-xs text-muted-foreground">All fields except notes are required.</p>
            </div>
          </div>
          {ok && <div className="mb-4 rounded-xl bg-success/15 p-3 text-sm text-success"><i className="fa-solid fa-check mr-2" />Expense added! Redirecting…</div>}
          {error ? <div className="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</div> : null}
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <F label="Amount (₹)" icon="fa-indian-rupee-sign"><input required type="number" min="1" value={f.amount} onChange={up("amount")} className="input" placeholder="0" /></F>
            <F label="Date" icon="fa-calendar"><input required type="date" value={f.date} onChange={up("date")} className="input" /></F>
            <F label="Category" icon="fa-layer-group">
              <select required value={f.category} onChange={up("category")} className="input">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </F>
            <F label="Payment Mode" icon="fa-credit-card">
              <select required value={f.paymentMode} onChange={up("paymentMode")} className="input">
                {PAYMENT_METHODS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </F>
            <div className="sm:col-span-2">
              <F label="Merchant" icon="fa-store"><input required value={f.merchant} onChange={up("merchant")} className="input" placeholder="e.g. Amazon, Zomato" /></F>
            </div>
            <div className="sm:col-span-2">
              <F label="Notes" icon="fa-note-sticky"><textarea rows={3} value={f.notes} onChange={up("notes")} className="input resize-none" placeholder="Optional" /></F>
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <button type="button" onClick={() => navigate({ to: "/dashboard" })} className="glass flex-1 rounded-full py-3 text-sm font-semibold">Cancel</button>
              <button className="bg-gradient-brand flex-1 rounded-full py-3 text-sm font-semibold text-white shadow-elegant transition hover:scale-[1.02]"><i className="fa-solid fa-plus mr-2" />Add Expense</button>
            </div>
          </form>
        </div>
      </div>
      <style>{`.input{width:100%;border-radius:1rem;background:color-mix(in oklab, var(--card) 70%, transparent);border:1px solid var(--border);padding:.7rem 1rem;font-size:.9rem;outline:none;transition:all .2s}.input:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in oklab,var(--primary) 25%,transparent)}`}</style>
    </AppShell>
  );
}

function F({ label, icon, children }: any) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <i className={`fa-solid ${icon}`} /> {label}
      </div>
      {children}
    </label>
  );
}
