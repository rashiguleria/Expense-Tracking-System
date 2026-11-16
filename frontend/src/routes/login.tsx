import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/AppShell";
import { BASE_URL } from "@/lib/api";


export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — ExpenseVision" }] }),
  component: Login,
});

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");

  if (!email || !password) {
    setError("Please enter email and password.");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Invalid email or password.");
      return;
    }

    login({
      id: data.user.user_id,
      name: data.user.full_name,
      email: data.user.email,
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
        <div className="glass hidden overflow-hidden rounded-3xl p-10 md:block">
          <Logo size={48} />
          <h2 className="mt-8 text-3xl font-black leading-tight">Welcome back.<br /><span className="text-gradient-brand">Track smarter.</span></h2>
          <p className="mt-3 text-muted-foreground">Sign in to view your dashboard, insights and budget health.</p>
          <div className="bg-gradient-brand mt-10 grid aspect-square place-items-center rounded-3xl text-white shadow-elegant">
            <i className="fa-solid fa-wallet text-8xl opacity-90" />
          </div>
        </div>
        <div className="glass rounded-3xl p-8 shadow-elegant">
          <div className="mb-6 md:hidden"><Logo /></div>
          <h1 className="text-2xl font-black">Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Access your financial dashboard.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email" icon="fa-envelope">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
            </Field>
            <Field label="Password" icon="fa-lock">
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" />
            </Field>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-primary" /> Remember me</label>
              <a href="#" className="text-primary hover:underline">Forgot password?</a>
            </div>
            {error && <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</div>}
            <button className="bg-gradient-brand w-full rounded-full py-3 text-sm font-semibold text-white shadow-elegant transition hover:scale-[1.02]">
              <i className="fa-solid fa-right-to-bracket mr-2" /> Login
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here? <Link to="/register" className="font-semibold text-primary hover:underline">Create an account</Link>
          </p>
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
