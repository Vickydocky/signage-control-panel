import { useMemo, useState } from "react";
import type { Device, DeviceStatus } from "@signage/shared";
import {
  EmptyState,
  StatusBadge,
  StatCard,
  btnGhost,
  btnPrimary,
  inputClass,
  useNow,
} from "../components/ui";
import type { ToastKind } from "../components/ui";
import type { UseDevices } from "../hooks/useDevices";
import { usePlaylists } from "../hooks/usePlaylists";
import { api } from "../lib/api";
import { timeAgo } from "../lib/format";
import { DeviceFormModal, PushModal, TokenModal } from "./DeviceModals";
import {
  Tv,
  Zap,
  KeyRound,
  Pencil,
  Trash2,
  Search,
  LayoutGrid,
  List,
  MapPin,
  Clock,
  Plus,
  Radio,
  ListMusic,
  CheckCircle2,
} from "lucide-react";

type Modal =
  | { kind: "form"; device?: Device }
  | { kind: "token"; device: Pick<Device, "id" | "nama"> }
  | { kind: "push"; device: Device };

interface Props extends UseDevices {
  notify: (message: string, kind?: ToastKind) => void;
}

export function DevicesPage({
  devices,
  loading,
  error,
  pushContent,
  notify,
}: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DeviceStatus | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [modal, setModal] = useState<Modal | null>(null);
  const now = useNow();
  const { playlists } = usePlaylists();

  const playlistName = useMemo(
    () => new Map(playlists.map((p) => [p.id, p.nama])),
    [playlists],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...devices]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .filter((d) => status === "all" || d.status === status)
      .filter(
        (d) =>
          !term || `${d.nama} ${d.lokasi ?? ""}`.toLowerCase().includes(term),
      );
  }, [devices, search, status]);

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const withPlaylistCount = devices.filter((d) => d.playlist_id).length;

  async function remove(device: Device) {
    if (!window.confirm(`Delete “${device.nama}”? This cannot be undone.`))
      return;
    try {
      await api.devices.remove(device.id);
      notify("Device deleted");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete", "error");
    }
  }

  function push(device: Device, contentId: string, duration: number) {
    if (pushContent(device.id, contentId, duration)) {
      notify(`Sent to ${device.nama}`);
    } else {
      notify("Not connected to the server. Try again in a moment.", "error");
    }
    setModal(null);
  }

  return (
    <section className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-3">
            <Tv className="h-7 w-7 text-blue-500" />
            Screens Fleet
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Monitor display health, broadcast instant takeovers, and assign playback loops.
          </p>
        </div>
        <button
          className={btnPrimary}
          onClick={() => setModal({ kind: "form" })}
        >
          <Plus className="h-4 w-4" />
          <span>Add Screen</span>
        </button>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Active Online Screens"
          value={onlineCount}
          subvalue={`${devices.length} total screens registered`}
          icon={Radio}
          gradient="bg-emerald-500"
        />
        <StatCard
          title="Screens with Playlist"
          value={withPlaylistCount}
          subvalue={`${devices.length - withPlaylistCount} waiting for assignment`}
          icon={ListMusic}
          gradient="bg-blue-500"
        />
        <StatCard
          title="Fleet Connectivity"
          value={devices.length > 0 ? `${Math.round((onlineCount / devices.length) * 100)}%` : "0%"}
          subvalue="Realtime WebSocket presence"
          icon={CheckCircle2}
          gradient="bg-indigo-500"
        />
      </div>

      {/* Toolbar: Search, Filters, and View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-2.5 backdrop-blur-xl">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              className="h-9 w-full rounded-lg border border-zinc-700/70 bg-zinc-950/80 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="Search by name or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search screens"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-zinc-950/50 p-1">
            {(["all", "online", "offline"] as const).map((s) => {
              const active = status === s;
              const count =
                s === "all"
                  ? devices.length
                  : devices.filter((d) => d.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {s} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-zinc-950/50 p-1">
          <button
            onClick={() => setViewMode("grid")}
            title="Grid view"
            className={`rounded-md p-1.5 transition ${
              viewMode === "grid"
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            title="Table view"
            className={`rounded-md p-1.5 transition ${
              viewMode === "table"
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-white/5 bg-zinc-900/50"
            />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <EmptyState
          title="No screens registered yet"
          hint="Register your first digital signage screen, then open the device app to pair with its ID & Token."
          action={
            <button
              className={btnPrimary}
              onClick={() => setModal({ kind: "form" })}
            >
              <Plus className="h-4 w-4" />
              <span>Register Screen</span>
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No screens match your search or filter" />
      ) : viewMode === "grid" ? (
        /* GRID VIEW: Digital Signage Screen Mockup Cards */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((d) => {
            const isOnline = d.status === "online";
            const plName = d.playlist_id ? playlistName.get(d.playlist_id) : null;
            return (
              <div
                key={d.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950/90 p-5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/5"
              >
                {/* Simulated Screen Bezel & Preview Header */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="relative grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/40 text-blue-400">
                        <Tv className="h-4 w-4" />
                        <span
                          className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-900 ${
                            isOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-zinc-600"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-zinc-100 text-sm group-hover:text-blue-400 transition-colors">
                          {d.nama}
                        </h3>
                        <p className="flex items-center gap-1 text-xs text-zinc-400 truncate">
                          <MapPin className="h-3 w-3 shrink-0 text-zinc-500" />
                          <span>{d.lokasi || "Unassigned location"}</span>
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>

                  {/* Screen Content Preview Mockup */}
                  <div className="mt-4 relative flex h-24 w-full flex-col items-center justify-center rounded-xl border border-white/10 bg-black/60 p-3 text-center overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-indigo-500/5 to-transparent" />
                    {plName ? (
                      <div className="relative z-10 flex flex-col items-center gap-1">
                        <span className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-300">
                          <ListMusic className="h-3 w-3" />
                          {plName}
                        </span>
                        <span className="text-[11px] text-zinc-400">Playing in loop</span>
                      </div>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center gap-1 text-zinc-500">
                        <span className="text-xs">No playlist attached</span>
                        <span className="text-[10px] text-zinc-400">Idle standby screen</span>
                      </div>
                    )}
                  </div>

                  {/* Last Seen Meta */}
                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Clock className="h-3 w-3 text-zinc-400" />
                      <span>{timeAgo(d.last_seen, now)}</span>
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      ID: {d.id.slice(0, 8)}…
                    </span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="mt-5 pt-3 border-t border-white/[0.08] flex items-center justify-between gap-1.5">
                  <button
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                      isOnline
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-md shadow-orange-500/20"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
                    }`}
                    disabled={!isOnline}
                    onClick={() => setModal({ kind: "push", device: d })}
                    title={isOnline ? "Push content directly" : "Screen is offline"}
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>Push</span>
                  </button>

                  <button
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition"
                    onClick={() => setModal({ kind: "token", device: d })}
                    title="View credentials to connect this screen"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Connect</span>
                  </button>

                  <button
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200 transition"
                    onClick={() => setModal({ kind: "form", device: d })}
                    title="Edit settings"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  <button
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition"
                    onClick={() => remove(d)}
                    title="Delete screen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl shadow-xl">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-5 py-3.5">Screen Name</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Playlist</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Last Seen</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {visible.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-5 py-3.5 font-medium text-white flex items-center gap-2.5">
                    <div className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-zinc-800 text-blue-400">
                      <Tv className="h-3.5 w-3.5" />
                    </div>
                    <span>{d.nama}</span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-400">{d.lokasi ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    {d.playlist_id ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs text-blue-300">
                        <ListMusic className="h-3 w-3" />
                        {playlistName.get(d.playlist_id) ?? "…"}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-zinc-400">
                    {timeAgo(d.last_seen, now)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end items-center gap-1">
                      <button
                        className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/25 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={d.status !== "online"}
                        onClick={() => setModal({ kind: "push", device: d })}
                      >
                        <Zap className="h-3 w-3" />
                        <span>Push</span>
                      </button>
                      <button
                        className={btnGhost}
                        onClick={() => setModal({ kind: "token", device: d })}
                      >
                        Connect
                      </button>
                      <button
                        className={btnGhost}
                        onClick={() => setModal({ kind: "form", device: d })}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition"
                        onClick={() => remove(d)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.kind === "form" && (
        <DeviceFormModal
          device={modal.device}
          playlists={playlists}
          onClose={() => setModal(null)}
          onSaved={(saved, created) => {
            notify(created ? "Screen registered" : "Screen updated");
            setModal(created ? { kind: "token", device: saved } : null);
          }}
        />
      )}
      {modal?.kind === "token" && (
        <TokenModal
          device={modal.device}
          onClose={() => setModal(null)}
          onRotated={() => notify("New token generated")}
        />
      )}
      {modal?.kind === "push" && (
        <PushModal
          device={modal.device}
          onClose={() => setModal(null)}
          onPush={(cid, dur) => push(modal.device, cid, dur)}
        />
      )}
    </section>
  );
}

