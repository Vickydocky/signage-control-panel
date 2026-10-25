import { type FormEvent, useState } from "react";
import { uuidSchema } from "@signage/shared";
import { type Credentials, DEFAULT_SERVER_URL } from "../lib/config";

const input =
  "block w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30";

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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-slate-900 p-8 shadow-xl ring-1 ring-slate-800"
      >
        <div>
          <h1 className="text-xl font-semibold text-white">
            🖥️ Connect this screen
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            In the control panel, open{" "}
            <span className="font-medium text-slate-200">
              Devices → Connect
            </span>{" "}
            and copy the ID and token.
          </p>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">
            Server URL
          </span>
          <input
            className={input}
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://localhost:4000"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">
            Device ID
          </span>
          <input
            className={`${input} font-mono`}
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="3965d216-374b-42e5-96e6-6baca9c25b94"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-300">
            Device token
          </span>
          <input
            className={`${input} font-mono`}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300 ring-1 ring-red-900"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          Connect
        </button>
      </form>
    </div>
  );
}
