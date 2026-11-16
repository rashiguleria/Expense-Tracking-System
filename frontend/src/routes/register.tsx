import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/AppShell";
import { BASE_URL } from "@/lib/api";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Register — ExpenseVision" }] }),
  component: Register,
});

function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!f.name.trim())
    return setError("Enter your name");

  if (!f.email.includes("@"))
    return setError("Enter a valid email");

  if (f.password.length < 4)
    return setError("Password must be at least 4 characters");

  if (f.password !== f.confirm)
    return setError("Passwords do not match");

  setError("");

  try {
    const response = await fetch(`${BASE_URL}/api/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: f.name,
        email: f.email,
        phone: f.phone,
        password: f.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Registration failed");
      return;
    }

    login({
      id: data.user.user_id,
      name: data.user.full_name,
      email: data.user.email,
      phone: data.user.phone,
    });

    navigate({ to: "/dashboard" });

  } catch (err) {
    console.error(err);
    setError("Unable to connect to the backend.");
  }
};

  return (
    <div className="bg-gradient-mesh grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
        <div className="glass rounded-3xl p-8 shadow-elegant">
          <div className="mb-6"><Logo /></div>
          <h1 className="text-2xl font-black">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start tracking your money in minutes.</p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <Field label="Full Name" icon="fa-user"><input required value={f.name} onChange={upd("name")} className="input" placeholder="John Doe" /></Field>
            <Field label="Email" icon="fa-envelope"><input type="email" required value={f.email} onChange={upd("email")} className="input" placeholder="you@example.com" /></Field>
            <Field label="Phone" icon="fa-phone"><input value={f.phone} onChange={upd("phone")} className="input" placeholder="+91 98765 43210" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Password" icon="fa-lock"><input type="password" required value={f.password} onChange={upd("password")} className="input" placeholder="••••••••" /></Field>
              <Field label="Confirm" icon="fa-lock"><input type="password" required value={f.confirm} onChange={upd("confirm")} className="input" placeholder="••••••••" /></Field>
            </div>
            {error && <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>}
            <button className="bg-gradient-brand w-full rounded-full py-3 text-sm font-semibold text-white shadow-elegant transition hover:scale-[1.02]">
              <i className="fa-solid fa-user-plus mr-2" /> Create account
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Login</Link>
          </p>
        </div>
        <div className="glass hidden overflow-hidden rounded-3xl p-10 md:block">
          <h2 className="text-3xl font-black leading-tight">Join <span className="text-gradient-brand">20+ users</span> managing their finances smartly.</h2>
          <ul className="mt-6 space-y-3 text-sm">
            {["3600+ expenses tracked","Interactive drill-down analytics","Smart insights & recommendations","Budget alerts"].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="bg-success grid h-6 w-6 place-items-center rounded-full text-white"><i className="fa-solid fa-check text-xs" /></span>{t}</li>
            ))}
          </ul>
          <div className="bg-gradient-brand mt-8 grid aspect-video place-items-center rounded-3xl text-white shadow-elegant">
            <i className="fa-solid fa-chart-pie text-7xl opacity-90" />
          </div>
        </div>
      </div>
      <style>{`.input{width:100%;border-radius:1rem;background:color-mix(in oklab, var(--card) 70%, transparent);border:1px solid var(--border);padding:.7rem 1rem;font-size:.9rem;outline:none;transition:all .2s}.input:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in oklab,var(--primary) 25%,transparent)}`}</style>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <i className={`fa-solid ${icon}`} /> {label}
      </div>
      {children}
    </label>
  );
}
