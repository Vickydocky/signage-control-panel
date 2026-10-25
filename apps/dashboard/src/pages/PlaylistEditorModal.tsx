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
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Clock,
  Layers,
  Image,
  Film,
  FileText,
  Globe,
} from "lucide-react";

interface Row {
  uid: number;
  content: Content;
  duration: number;
}

const DEFAULT_DURATION = 10;
const validDuration = (n: number) => Number.isInteger(n) && n >= 1 && n <= 3600;

const TYPE_ICONS = {
  image: Image,
  video: Film,
  text: FileText,
  url: Globe,
};

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
      title={playlist ? "Edit Playlist Sequence" : "Create New Playlist"}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        <Field label="Playlist Title">
          <input
            className={inputClass}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="e.g. Lobby Information Loop / Morning Showcase"
            maxLength={120}
            autoFocus
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-300">
              Sequence Timeline
            </span>
            {rows.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
                <Clock className="h-3 w-3" />
                <span>{rows.length} slides • {totalSeconds}s total cycle</span>
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-zinc-400 justify-center">
              <Spinner /> Loading playlist sequence…
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-zinc-950/60 p-6 text-center text-xs text-zinc-400">
              <Layers className="mx-auto h-7 w-7 text-zinc-600 mb-2" />
              <span>No slides added yet. Select media items from the dropdown below to assemble your loop.</span>
            </div>
          ) : (
            <ol className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {rows.map((r, i) => {
                const Icon = TYPE_ICONS[r.content.tipe] || FileText;
                return (
                  <li
                    key={r.uid}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/80 p-3 text-xs backdrop-blur-md shadow-sm transition hover:border-white/20"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/10 font-mono text-[11px] font-bold text-zinc-300">
                      {i + 1}
                    </span>

                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-blue-400">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white text-xs">
                        {r.content.judul}
                      </p>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                        {r.content.tipe}
                      </span>
                    </div>

                    {/* Duration input */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1">
                      <input
                        type="number"
                        min={1}
                        max={3600}
                        value={r.duration}
                        onChange={(e) =>
                          setDuration(r.uid, Number(e.target.value))
                        }
                        aria-label={`Seconds for ${r.content.judul}`}
                        className="w-12 bg-transparent text-center font-mono text-xs font-semibold text-white outline-none"
                      />
                      <span className="text-[10px] text-zinc-400">sec</span>
                    </div>

                    {/* Reorder & Delete */}
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition disabled:opacity-20"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        title="Move slide up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition disabled:opacity-20"
                        disabled={i === rows.length - 1}
                        onClick={() => move(i, 1)}
                        title="Move slide down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition"
                        onClick={() =>
                          setRows((prev) => prev.filter((x) => x.uid !== r.uid))
                        }
                        title="Remove slide from playlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <Field
          label="Add Content Slide to Loop"
          hint={
            contents?.length === 0
              ? "No content yet. Create some in the Media Library tab first."
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
              {contents ? "+ Select media to append to sequence…" : "Loading library…"}
            </option>
            {contents?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.judul} ({c.tipe})
              </option>
            ))}
          </select>
        </Field>

        <ErrorText message={error} />

        <div className="flex justify-end gap-2 border-t border-zinc-800/80 pt-4">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={!canSave}
            onClick={save}
          >
            {saving ? "Saving…" : "Save Playlist Sequence"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

