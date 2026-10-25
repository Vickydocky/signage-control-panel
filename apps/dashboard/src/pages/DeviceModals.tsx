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

const messageOf = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong";

const footer = "flex justify-end gap-2 border-t border-zinc-100 pt-4";

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
    <Modal title={device ? "Edit device" : "Add device"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Name">
          <input
            className={inputClass}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Lobby Display"
            maxLength={120}
            required
            autoFocus
          />
        </Field>
        <Field label="Location" hint="Optional">
          <input
            className={inputClass}
            value={lokasi}
            onChange={(e) => setLokasi(e.target.value)}
            placeholder="Floor 1 - Lobby"
            maxLength={200}
          />
        </Field>
        {device && (
          <Field
            label="Playlist"
            hint="Played on repeat while no content is being pushed"
          >
            <select
              className={inputClass}
              value={playlistId}
              onChange={(e) => setPlaylistId(e.target.value)}
            >
              <option value="">None</option>
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
            {saving ? "Saving…" : device ? "Save changes" : "Create device"}
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
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
      </span>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          className={`${inputClass} bg-zinc-50 font-mono text-xs`}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className={`${btnSecondary} w-20 shrink-0`}
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
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
        "Generate a new token? The device will be disconnected and must use the new token.",
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
      <div className="space-y-5">
        <p className="text-sm text-zinc-600">
          Enter these credentials in the device app to connect this screen.
        </p>
        <CopyRow label="Device ID" value={device.id} />
        {token ? (
          <CopyRow label="Device token" value={token} />
        ) : (
          !error && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Spinner /> Loading token…
            </div>
          )
        )}
        <ErrorText message={error} />
        <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-4">
          <button
            type="button"
            className={btnDanger}
            onClick={rotate}
            disabled={rotating || !token}
          >
            {rotating ? "Generating…" : "Regenerate token"}
          </button>
          <button type="button" className={btnSecondary} onClick={onClose}>
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
    <Modal title={`Push content to “${device.nama}”`} onClose={onClose}>
      <div className="space-y-5">
        {contents === null && !error && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Spinner /> Loading contents…
          </div>
        )}
        {contents?.length === 0 && (
          <p className="text-sm text-zinc-600">
            No content yet. Add some in the Contents tab first.
          </p>
        )}

        {contents && contents.length > 0 && (
          <ul className="max-h-64 space-y-0.5 overflow-y-auto rounded-md border border-zinc-200 p-1">
            {contents.map((c) => (
              <li key={c.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
                    selected === c.id
                      ? "bg-blue-50 ring-1 ring-inset ring-blue-600/20"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="content"
                    className="accent-blue-600"
                    checked={selected === c.id}
                    onChange={() => setSelected(c.id)}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-zinc-900">
                    {c.judul}
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                    {c.tipe}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <Field label="Show for (seconds)">
          <input
            type="number"
            min={1}
            max={3600}
            className={inputClass}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </Field>
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
            Push now
          </button>
        </div>
      </div>
    </Modal>
  );
}
