import { useEffect, useState } from "react";
import { ConnectionPill, ToastView, useToast } from "./components/ui";
import { useDevices } from "./hooks/useDevices";
import type { Session } from "./lib/session";
import { ContentsPage } from "./pages/ContentsPage";
import { DevicesPage } from "./pages/DevicesPage";
import { PlaylistsPage } from "./pages/PlaylistsPage";

type Tab = "devices" | "contents" | "playlists";
const TABS: { id: Tab; label: string }[] = [
  { id: "devices", label: "Devices" },
  { id: "contents", label: "Contents" },
  { id: "playlists", label: "Playlists" },
];

const tabFromHash = (): Tab => {
  const hash = window.location.hash.slice(1);
  return hash === "contents" || hash === "playlists" ? hash : "devices";
};

export function Dashboard({
  session,
  onSignOut,
  onSessionEnded,
}: {
  session: Session;
  onSignOut: () => void;
  onSessionEnded: () => void;
}) {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const { toast, notify } = useToast();
  // Dipanggil di level ini agar koneksi WebSocket tetap hidup saat pindah tab
  const devices = useDevices(
    session.token,
    (message) => notify(message, "error"),
    onSessionEnded,
  );

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-stretch justify-between gap-4 px-4">
          <div className="flex min-w-0 items-stretch gap-8">
            <div className="flex items-center gap-2.5 py-3">
              <span
                aria-hidden="true"
                className="grid h-6 w-6 place-items-center rounded-md bg-blue-600"
              >
                <span className="h-2.5 w-3.5 rounded-[2px] border-2 border-white" />
              </span>
              <span className="hidden text-sm font-semibold tracking-tight sm:inline">
                Signage
              </span>
            </div>

            <nav
              className="-mb-px flex items-stretch gap-6 overflow-x-auto"
              aria-label="Main"
            >
              {TABS.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={`flex items-center border-b-2 text-sm font-medium transition-colors ${
                    tab === t.id
                      ? "border-blue-600 text-zinc-900"
                      : "border-transparent text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {t.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <ConnectionPill state={devices.connection} />
            <span className="hidden text-sm text-zinc-500 md:inline">
              {session.username}
            </span>
            <button
              onClick={onSignOut}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {devices.connection === "reconnecting" && (
        <div
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900"
        >
          Connection to the server was lost. Reconnecting… Device status may be
          out of date.
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === "devices" && <DevicesPage {...devices} notify={notify} />}
        {tab === "contents" && <ContentsPage notify={notify} />}
        {tab === "playlists" && <PlaylistsPage notify={notify} />}
      </main>

      <ToastView toast={toast} />
    </div>
  );
}