import { type FormEvent, useId, useState } from "react";
import { api } from "../lib/api";
import type { Session } from "../lib/session";

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

  const label = "block text-sm font-medium text-zinc-700";
  const input =
    "mt-1.5 block h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      {/* faint grid, fades out downward */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, #e4e4e7 1px, transparent 1px), linear-gradient(to bottom, #e4e4e7 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 60% 100% at 50% 0%, #000 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 100% at 50% 0%, #000 30%, transparent 100%)",
        }}
      />

      <header className="relative flex items-center gap-2.5 px-6 py-5">
        <span
          aria-hidden="true"
          className="grid h-6 w-6 place-items-center rounded-md bg-blue-600"
        >
          <span className="h-2.5 w-3.5 rounded-[2px] border-2 border-white" />
        </span>
        <span className="text-sm font-semibold tracking-tight text-zinc-900">
          Signage
        </span>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-6 pb-24">
        <form onSubmit={submit} className="w-full max-w-[22rem]">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Sign in to Signage
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Manage your screens, content and playlists.
          </p>

          {notice && (
            <p
              role="status"
              className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              {notice}
            </p>
          )}

          <div className="mt-8 space-y-5">
            <div>
              <label htmlFor={userId} className={label}>
                Username
              </label>
              <input
                id={userId}
                className={input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div>
              <label htmlFor={passId} className={label}>
                Password
              </label>
              <div className="relative">
                <input
                  id={passId}
                  className={`${input} pr-14`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1.5 rounded px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !username.trim() || !password}
            className="mt-6 h-10 w-full rounded-md bg-blue-600 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}