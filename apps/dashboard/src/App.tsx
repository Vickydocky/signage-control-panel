import { useEffect, useState } from "react";
import { ConnectionPill, ToastView, useToast } from "./components/ui";
import { useDevices } from "./hooks/useDevices";
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

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const { toast, notify } = useToast();
  // Dipanggil di level App agar koneksi WebSocket tetap hidup saat pindah tab
  const devices = useDevices((message) => notify(message, "error"));

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold">
              📺 Signage Control Panel
            </span>
            <nav className="flex gap-1" aria-label="Main">
              {TABS.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    tab === t.id
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {t.label}
                </a>
              ))}
            </nav>
          </div>
          <ConnectionPill state={devices.connection} />
        </div>
      </header>

      {devices.connection === "reconnecting" && (
        <div
          role="status"
          className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800"
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
