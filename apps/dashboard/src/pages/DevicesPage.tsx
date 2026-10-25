import { useMemo, useState } from "react";
import type { Device, DeviceStatus } from "@signage/shared";
import {
  EmptyState,
  StatusBadge,
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
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Devices
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {devices.length === 0
              ? "No screens yet"
              : `${onlineCount} of ${devices.length} online`}
          </p>
        </div>
        <button
          className={btnPrimary}
          onClick={() => setModal({ kind: "form" })}
        >
          + Add device
        </button>
      </div>

      {devices.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            className={`${inputClass} max-w-xs`}
            placeholder="Search name or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search devices"
          />
          <select
            className={`${inputClass} w-auto`}
            value={status}
            onChange={(e) => setStatus(e.target.value as DeviceStatus | "all")}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg bg-zinc-200/70"
            />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <EmptyState
          title="No devices yet"
          hint="Add your first screen, then connect the device app with its ID and token."
          action={
            <button
              className={btnPrimary}
              onClick={() => setModal({ kind: "form" })}
            >
              + Add device
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No devices match your filters" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/70 text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Playlist</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last seen</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visible.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {d.nama}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{d.lokasi ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {d.playlist_id
                      ? (playlistName.get(d.playlist_id) ?? "…")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {timeAgo(d.last_seen, now)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-0.5">
                      <button
                        className={btnGhost}
                        disabled={d.status !== "online"}
                        title={
                          d.status === "online"
                            ? "Send content to this screen now"
                            : "Device is offline"
                        }
                        onClick={() => setModal({ kind: "push", device: d })}
                      >
                        Push
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
                        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
                        onClick={() => remove(d)}
                      >
                        Delete
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
            notify(created ? "Device created" : "Device updated");
            // Device baru: langsung tampilkan kredensialnya
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
