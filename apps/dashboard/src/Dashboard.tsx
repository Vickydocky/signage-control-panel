import { useEffect, useState } from "react";
import { ConnectionPill, ToastView, useToast } from "./components/ui";
import { useDevices } from "./hooks/useDevices";
import type { Session } from "./lib/session";
import { ContentsPage } from "./pages/ContentsPage";
import { DevicesPage } from "./pages/DevicesPage";
import { PlaylistsPage } from "./pages/PlaylistsPage";
import { Tv, FolderKanban, ListMusic, LogOut, Radio, User } from "lucide-react";

type Tab = "devices" | "contents" | "playlists";

const TABS: { id: Tab; label: string; icon: typeof Tv }[] = [
  { id: "devices", label: "Screens", icon: Tv },
  { id: "contents", label: "Media Library", icon: FolderKanban },
  { id: "playlists", label: "Playlists", icon: ListMusic },
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
    <div className="relative min-h-screen bg-[#080c14] text-zinc-100 overflow-x-hidden selection:bg-blue-500/30 selection:text-white">
      {/* Ambient background glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[600px] rounded-full bg-blue-600/10 blur-[130px]" />
        <div className="absolute top-1/3 -right-40 h-[450px] w-[500px] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 h-[500px] w-[600px] rounded-full bg-violet-600/10 blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-zinc-950/75 backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 py-3">
          <div className="flex min-w-0 items-center gap-8">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-blue-500/25">
                <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-zinc-950/90 backdrop-blur-sm">
                  <Radio className="h-4 w-4 text-blue-400" />
                </div>
              </div>
              <div className="leading-tight">
                <span className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  Signage Control
                </span>
                <span className="hidden sm:block text-[10px] font-medium uppercase tracking-wider text-blue-400/80">
                  Mission Center
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 backdrop-blur-md"
              aria-label="Main"
            >
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <a
                    key={t.id}
                    href={`#${t.id}`}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 font-semibold"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? "text-white" : "text-zinc-400"}`} />
                    <span>{t.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Right Status & Profile Controls */}
          <div className="flex shrink-0 items-center gap-3">
            <ConnectionPill state={devices.connection} />

            <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1.5 pr-3 text-xs text-zinc-300">
              <div className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-[10px] font-bold text-white">
                {session.username.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-zinc-200">{session.username}</span>
            </div>

            <button
              onClick={onSignOut}
              title="Sign out"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {devices.connection === "reconnecting" && (
        <div
          role="status"
          className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-300 backdrop-blur-md"
        >
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 animate-ping rounded-full bg-amber-400" />
            Connection to realtime server was temporarily lost. Reconnecting… Status may lag.
          </span>
        </div>
      )}

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {tab === "devices" && <DevicesPage {...devices} notify={notify} />}
        {tab === "contents" && <ContentsPage notify={notify} />}
        {tab === "playlists" && <PlaylistsPage notify={notify} />}
      </main>

      <ToastView toast={toast} />
    </div>
  );
}