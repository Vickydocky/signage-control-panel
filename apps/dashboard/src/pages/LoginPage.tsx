import { type FormEvent, useId, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/session";
import { Radio, User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";

export function LoginPage({
  notice,
  onLoggedIn,
}: {
  notice: string | null;
  onLoggedIn: (session: Session) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = useId();
  const passId = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.auth.login({ username: username.trim(), password });
      onLoggedIn({
        token: res.token,
        expiresAt: res.expiresAt,
        username: res.admin.username,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  const label = "block text-xs font-medium uppercase tracking-wider text-zinc-300";
  const input =
    "mt-1.5 block h-11 w-full rounded-xl border border-zinc-700/80 bg-zinc-900/90 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#070b12] text-zinc-100 px-4 overflow-hidden selection:bg-blue-500/30 selection:text-white">
      {/* Radiant atmospheric background glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[550px] w-[550px] rounded-full bg-blue-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[550px] w-[550px] rounded-full bg-indigo-600/15 blur-[140px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <main className="relative z-10 w-full max-w-[24rem]">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1.5px] shadow-xl shadow-blue-500/30">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-zinc-950/95 backdrop-blur-md">
              <Radio className="h-7 w-7 text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Signage Control
          </h1>
          <p className="mt-1.5 text-xs text-zinc-400 max-w-xs">
            Sign in to manage your digital screen fleet, media library, and broadcast schedules.
          </p>
        </div>

        {/* Glass Card */}
        <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5">
          {notice && (
            <div
              role="status"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-300"
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor={userId} className={label}>
                Username
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  id={userId}
                  className={input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="admin"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor={passId} className={label}>
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  id={passId}
                  className={`${input} pr-12`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-500 hover:text-zinc-200 transition"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-[position:right_center] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>{submitting ? "Authenticating…" : "Sign in to Dashboard"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Signage Control Center • Realtime Display Platform
        </p>
      </main>
    </div>
  );
}