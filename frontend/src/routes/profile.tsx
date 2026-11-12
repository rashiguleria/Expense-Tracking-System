import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { fetchUsers } from "@/lib/api";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — ExpenseVision" }] }),
  component: Profile,
});

function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({
    name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const up = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const users = await fetchUsers();
        if (!mounted) return;
        const current = users.find((entry) => entry.email === user?.email || entry.name === user?.name);
        if (current) {
          setF({ name: current.name, email: current.email, phone: current.phone ?? "" });
        }
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load profile data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [user?.email, user?.name]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(f);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-3xl">
        <div className="glass rounded-3xl p-6 shadow-elegant sm:p-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="bg-gradient-brand grid h-24 w-24 place-items-center rounded-full text-3xl font-black text-white shadow-elegant">
              {(f.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-black">{f.name || "Your Name"}</h2>
              <p className="text-sm text-muted-foreground">{f.email}</p>
              <p className="text-xs text-muted-foreground">{f.phone || "No phone"}</p>
            </div>
          </div>
          {loading ? <div className="mt-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">Loading profile data…</div> : null}
          {error ? <div className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</div> : null}
          {saved && <div className="mt-4 rounded-xl bg-success/15 p-3 text-sm text-success"><i className="fa-solid fa-check mr-2" />Profile updated.</div>}
          <form onSubmit={save} className="mt-8 grid gap-4 sm:grid-cols-2">
            <F label="Full Name" icon="fa-user"><input required value={f.name} onChange={up("name")} className="input" /></F>
            <F label="Email" icon="fa-envelope"><input type="email" required value={f.email} onChange={up("email")} className="input" /></F>
            <F label="Phone" icon="fa-phone"><input value={f.phone} onChange={up("phone")} className="input" /></F>
            <F label="Password" icon="fa-lock"><input type="password" placeholder="Leave blank to keep current" className="input" /></F>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button className="bg-gradient-brand rounded-full px-6 py-3 text-sm font-semibold text-white shadow-elegant transition hover:scale-[1.02]"><i className="fa-solid fa-floppy-disk mr-2" />Update Profile</button>
              <button type="button" className="glass rounded-full px-6 py-3 text-sm font-semibold"><i className="fa-solid fa-key mr-2" />Change Password</button>
              <button type="button" onClick={() => { logout(); navigate({ to: "/" }); }} className="bg-danger/10 text-danger rounded-full px-6 py-3 text-sm font-semibold transition hover:bg-danger/20 ml-auto"><i className="fa-solid fa-right-from-bracket mr-2" />Logout</button>
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
