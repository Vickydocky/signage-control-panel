import { type FormEvent, useId, useState } from "react";
import { uuidSchema } from "@signage/shared";
import { type Credentials, DEFAULT_SERVER_URL } from "../lib/config";
import { Tv, Globe, KeyRound, ArrowRight, Radio, ShieldCheck } from "lucide-react";

const label = "block text-xs font-medium uppercase tracking-wider text-zinc-300";
const input =
  "mt-1.5 block h-11 w-full rounded-xl border border-zinc-700/80 bg-zinc-900/90 pl-10 pr-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15";

export function SetupScreen({
  initial,
  onSubmit,
}: {
  initial: Credentials | null;
  onSubmit: (c: Credentials) => void;
}) {
  const [serverUrl, setServerUrl] = useState(
    initial?.serverUrl ?? DEFAULT_SERVER_URL,
  );
  const [deviceId, setDeviceId] = useState(initial?.deviceId ?? "");
  const [token, setToken] = useState(initial?.token ?? "");
  const [error, setError] = useState<string | null>(null);

  const urlId = useId();
  const idId = useId();
  const tokenId = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
    const url = serverUrl.trim();
    const id = deviceId.trim();

    if (!/^https?:\/\/.+/i.test(url))
      return setError("Server URL must start with http:// or https://");
    if (!uuidSchema.safeParse(id).success)
      return setError(
        "Device ID must be a valid UUID (copy it from the control panel).",
      );
    if (!token.trim()) return setError("Token is required.");

    setError(null);
    onSubmit({ serverUrl: url, deviceId: id, token: token.trim() });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#070b12] text-zinc-100 p-4 overflow-hidden selection:bg-blue-500/30 selection:text-white">
      {/* Radiant ambient glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[140px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <form onSubmit={submit} className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1px] shadow-lg shadow-blue-500/25">
            <div className="flex h-full w-full items-center justify-center rounded-[15px] bg-zinc-950/90">
              <Tv className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Connect Screen Display
            </h1>
            <p className="text-xs text-zinc-400">
              Pair this display client with your Signage Control Panel.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs text-zinc-300 mb-6 flex items-start gap-2.5">
          <Radio className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
          <span>
            In the dashboard, open <strong className="text-white">Screens → Connect</strong> on any screen to view and copy its pairing credentials.
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor={urlId} className={label}>
              Server URL
            </label>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                id={urlId}
                className={input}
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:4000"
              />
            </div>
          </div>

          <div>
            <label htmlFor={idId} className={label}>
              Screen Device ID
            </label>
            <div className="relative">
              <Tv className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                id={idId}
                className={`${input} font-mono text-xs`}
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="3965d216-374b-42e5-96e6-6baca9c25b94"
                autoComplete="off"
                spellCheck={false}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label htmlFor={tokenId} className={label}>
              Security Token
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                id={tokenId}
                className={`${input} font-mono text-xs`}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter 64-character device token"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-[position:right_center] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-[0.98]"
        >
          <span>Connect & Launch Player</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

