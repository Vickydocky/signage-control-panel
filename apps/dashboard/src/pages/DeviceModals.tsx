import { type FormEvent, useEffect, useState } from "react";
import type {
  Content,
  Device,
  DeviceWithToken,
  PlaylistSummary,
} from "@signage/shared";
import {
  Modal,
  ErrorText,
  Field,
  Spinner,
  btnDanger,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "../components/ui";
import { api } from "../lib/api";
import { Copy, Check, Zap, RotateCcw, Image, Film, FileText, Globe } from "lucide-react";

const messageOf = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong";

const footer = "flex justify-end gap-2 border-t border-zinc-800/80 pt-4";

// ---------------------------------------------------------------------
// Tambah / edit device
// ---------------------------------------------------------------------
export function DeviceFormModal({
  device,
  playlists,
  onClose,
  onSaved,
}: {
  device?: Device;
  playlists: PlaylistSummary[];
  onClose: () => void;
  onSaved: (device: DeviceWithToken, created: boolean) => void;
}) {
  const [nama, setNama] = useState(device?.nama ?? "");
  const [lokasi, setLokasi] = useState(device?.lokasi ?? "");
  const [playlistId, setPlaylistId] = useState(device?.playlist_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const input = { nama: nama.trim(), lokasi: lokasi.trim() || null };
      const saved = device
        ? await api.devices.update(device.id, {
            ...input,
            playlist_id: playlistId || null,
          })
        : await api.devices.create(input);
      onSaved(saved, !device);
    } catch (err) {
      setError(messageOf(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={device ? "Edit Screen Settings" : "Register New Screen"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Screen Name">
          <input
            className={inputClass}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="e.g. Main Lobby Display 4K"
            maxLength={120}
            required
            autoFocus
          />
        </Field>
        <Field label="Physical Location" hint="Optional description of where this screen is mounted">
          <input
            className={inputClass}
            value={lokasi}
            onChange={(e) => setLokasi(e.target.value)}
            placeholder="e.g. Building A - Front Reception"
            maxLength={200}
          />
        </Field>
        {device && (
          <Field
            label="Assigned Loop Playlist"
            hint="This playlist will play continuously on loop"
          >
            <select
              className={inputClass}
              value={playlistId}
              onChange={(e) => setPlaylistId(e.target.value)}
            >
              <option value="">No Playlist (Standby screen)</option>
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({p.item_count} item{p.item_count === 1 ? "" : "s"})
                </option>
              ))}
            </select>
          </Field>
        )}
        <ErrorText message={error} />
        <div className={footer}>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={btnPrimary}
            disabled={saving || !nama.trim()}
          >
            {saving ? "Saving…" : device ? "Save Changes" : "Register Screen"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Kredensial device (ID + token) untuk menghubungkan layar
// ---------------------------------------------------------------------
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-300">
        {label}
      </span>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          className={`${inputClass} bg-zinc-950 font-mono text-xs select-all`}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className={`${btnSecondary} w-24 shrink-0 gap-1.5`}
          onClick={copy}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function TokenModal({
  device,
  onClose,
  onRotated,
}: {
  device: Pick<Device, "id" | "nama">;
  onClose: () => void;
  onRotated: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    api.devices
      .get(device.id)
      .then((d) => setToken(d.device_token))
      .catch((err) => setError(messageOf(err)));
  }, [device.id]);

  async function rotate() {
    if (
      !window.confirm(
        "Generate a new token? The device currently connected will be kicked offline and must be reconfigured with the new token.",
      )
    )
      return;
    setRotating(true);
    setError(null);
    try {
      const updated = await api.devices.regenerateToken(device.id);
      setToken(updated.device_token);
      onRotated();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setRotating(false);
    }
  }

  return (
    <Modal title={`Connect “${device.nama}”`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Open the Signage Player on your display client (or browser at{" "}
          <code className="text-blue-400 font-mono">http://localhost:5174</code>) and enter these credentials to pair:
        </p>
        <CopyRow label="Device ID" value={device.id} />
        {token ? (
          <CopyRow label="Device Token" value={token} />
        ) : (
          !error && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Spinner /> Loading security token…
            </div>
          )
        )}
        <ErrorText message={error} />
        <div className="flex items-center justify-between gap-2 border-t border-zinc-800/80 pt-4">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-900/40 transition disabled:opacity-40"
            onClick={rotate}
            disabled={rotating || !token}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{rotating ? "Generating…" : "Rotate Token"}</span>
          </button>
          <button type="button" className={btnPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Kirim konten langsung ke device (push)
// ---------------------------------------------------------------------
const TYPE_ICONS = {
  image: Image,
  video: Film,
  text: FileText,
  url: Globe,
};

const DURATION_PRESETS = [5, 10, 15, 30, 60];

export function PushModal({
  device,
  onClose,
  onPush,
}: {
  device: Device;
  onClose: () => void;
  onPush: (contentId: string, durationSeconds: number) => void;
}) {
  const [contents, setContents] = useState<Content[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [duration, setDuration] = useState(10);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.contents
      .list()
      .then((res) => setContents(res.data))
      .catch((err) => setError(messageOf(err)));
  }, []);

  return (
    <Modal title={`Push Live Content to “${device.nama}”`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-zinc-400">
          Immediately take over the screen. When the duration expires, the screen automatically resumes its normal playlist.
        </p>

        {contents === null && !error && (
          <div className="flex items-center gap-2 text-sm text-zinc-400 py-4">
            <Spinner /> Loading media library…
          </div>
        )}
        {contents?.length === 0 && (
          <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-lg p-3">
            No media items available yet. Add items in the Media Library tab first.
          </p>
        )}

        {contents && contents.length > 0 && (
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-300">
              Select Content to Broadcast
            </span>
            <ul className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/70 p-1.5">
              {contents.map((c) => {
                const Icon = TYPE_ICONS[c.tipe] || FileText;
                const isSelected = selected === c.id;
                return (
                  <li key={c.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-xs transition-all ${
                        isSelected
                          ? "bg-blue-600/20 text-white border border-blue-500/40"
                          : "text-zinc-300 hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <input
                        type="radio"
                        name="content"
                        className="accent-blue-500"
                        checked={isSelected}
                        onChange={() => setSelected(c.id)}
                      />
                      <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-blue-400" : "text-zinc-500"}`} />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {c.judul}
                      </span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        {c.tipe}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <Field label="Display Duration (Seconds)">
            <input
              type="number"
              min={1}
              max={3600}
              className={inputClass}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </Field>
          {/* Quick preset buttons */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mr-1">
              Presets:
            </span>
            {DURATION_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDuration(p)}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                  duration === p
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {p}s
              </button>
            ))}
          </div>
        </div>

        <ErrorText message={error} />

        <div className={footer}>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={
              !selected ||
              !Number.isInteger(duration) ||
              duration < 1 ||
              duration > 3600
            }
            onClick={() => selected && onPush(selected, duration)}
          >
            <Zap className="h-4 w-4 fill-current" />
            <span>Broadcast Now</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

