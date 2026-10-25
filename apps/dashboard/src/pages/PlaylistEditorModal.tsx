import { useEffect, useRef, useState } from "react";
import type { Content, PlaylistSummary } from "@signage/shared";
import {
  ErrorText,
  Field,
  Modal,
  Spinner,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "../components/ui";
import { api } from "../lib/api";

interface Row {
  uid: number; // hanya untuk key React; konten yang sama boleh muncul lebih dari sekali
  content: Content;
  duration: number;
}

const DEFAULT_DURATION = 10;
const validDuration = (n: number) => Number.isInteger(n) && n >= 1 && n <= 3600;

const iconBtn =
  "rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500";

function Icon({ d }: { d: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export function PlaylistEditorModal({
  playlist,
  onClose,
  onSaved,
}: {
  playlist?: PlaylistSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nama, setNama] = useState(playlist?.nama ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  const [contents, setContents] = useState<Content[] | null>(null);
  const [loading, setLoading] = useState(Boolean(playlist));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextUid = useRef(0);
  // Kalau langkah kedua (simpan isi) gagal setelah playlist terbuat, percobaan ulang memakai playlist yang sama
  const createdId = useRef<string | null>(null);

  useEffect(() => {
    api.contents
      .list()
      .then((res) => setContents(res.data))
      .catch((err: Error) => setError(err.message));

    if (playlist) {
      api.playlists
        .get(playlist.id)
        .then((detail) =>
          setRows(
            detail.items.map((e) => ({
              uid: nextUid.current++,
              content: e.content,
              duration: e.duration_seconds,
            })),
          ),
        )
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [playlist]);

  function add(contentId: string) {
    const content = contents?.find((c) => c.id === contentId);
    if (content)
      setRows((prev) => [
        ...prev,
        { uid: nextUid.current++, content, duration: DEFAULT_DURATION },
      ]);
  }

  function move(index: number, delta: -1 | 1) {
    setRows((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const setDuration = (uid: number, duration: number) =>
    setRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, duration } : r)),
    );

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const id =
        playlist?.id ??
        createdId.current ??
        (await api.playlists.create({ nama: nama.trim() })).id;
      createdId.current = id;
      if (playlist && nama.trim() !== playlist.nama)
        await api.playlists.rename(id, { nama: nama.trim() });
      await api.playlists.replaceItems(id, {
        items: rows.map((r) => ({
          content_id: r.content.id,
          duration_seconds: r.duration,
        })),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  const totalSeconds = rows.reduce(
    (sum, r) => sum + (validDuration(r.duration) ? r.duration : 0),
    0,
  );
  const canSave =
    nama.trim() !== "" &&
    rows.every((r) => validDuration(r.duration)) &&
    !saving &&
    !loading;

  return (
    <Modal
      title={playlist ? "Edit playlist" : "New playlist"}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        <Field label="Name">
          <input
            className={inputClass}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Lobby loop"
            maxLength={120}
            autoFocus
          />
        </Field>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-zinc-700">
              Items, played in this order and repeated
            </span>
            {rows.length > 0 && (
              <span className="shrink-0 text-xs text-zinc-500">
                {rows.length} item{rows.length === 1 ? "" : "s"} ·{" "}
                {totalSeconds}s per cycle
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-zinc-500">
              <Spinner /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 px-4 py-6 text-center text-sm text-zinc-500">
              No items yet. Add content below.
            </p>
          ) : (
            <ol className="space-y-2">
              {rows.map((r, i) => (
                <li
                  key={r.uid}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-2"
                >
                  <span className="w-5 text-center text-sm tabular-nums text-zinc-400">
                    {i + 1}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900"
                    title={r.content.judul}
                  >
                    {r.content.judul}
                  </span>
                  <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                    {r.content.tipe}
                  </span>
                  <label className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-500">
                    <input
                      type="number"
                      min={1}
                      max={3600}
                      value={r.duration}
                      onChange={(e) =>
                        setDuration(r.uid, Number(e.target.value))
                      }
                      aria-label={`Seconds for ${r.content.judul}`}
                      className={`w-16 rounded-md border px-2 py-1 text-sm tabular-nums text-zinc-900 outline-none transition focus:ring-4 ${
                        validDuration(r.duration)
                          ? "border-zinc-300 focus:border-blue-600 focus:ring-blue-600/10"
                          : "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/10"
                      }`}
                    />
                    s
                  </label>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      className={iconBtn}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label="Move up"
                    >
                      <Icon d="M3.5 10l4.5-4.5 4.5 4.5" />
                    </button>
                    <button
                      type="button"
                      className={iconBtn}
                      disabled={i === rows.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label="Move down"
                    >
                      <Icon d="M3.5 6l4.5 4.5L12.5 6" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                      onClick={() =>
                        setRows((prev) => prev.filter((x) => x.uid !== r.uid))
                      }
                      aria-label="Remove"
                    >
                      <Icon d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <Field
          label="Add content"
          hint={
            contents?.length === 0
              ? "No content yet. Create some in the Contents tab first."
              : undefined
          }
        >
          <select
            className={inputClass}
            value=""
            disabled={!contents || contents.length === 0}
            onChange={(e) => add(e.target.value)}
          >
            <option value="">
              {contents ? "Choose content to add…" : "Loading…"}
            </option>
            {contents?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.judul} ({c.tipe})
              </option>
            ))}
          </select>
        </Field>

        <ErrorText message={error} />
        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={!canSave}
            onClick={save}
          >
            {saving ? "Saving…" : "Save playlist"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
