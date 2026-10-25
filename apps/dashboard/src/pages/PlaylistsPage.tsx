import { useState } from "react";
import type { PlaylistSummary } from "@signage/shared";
import { EmptyState, Spinner, btnGhost, btnPrimary } from "../components/ui";
import type { ToastKind } from "../components/ui";
import { usePlaylists } from "../hooks/usePlaylists";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { PlaylistEditorModal } from "./PlaylistEditorModal";
import { ListMusic, Plus, Pencil, Trash2, Clock, Layers } from "lucide-react";

type Editing = { playlist?: PlaylistSummary } | null;

export function PlaylistsPage({
  notify,
}: {
  notify: (message: string, kind?: ToastKind) => void;
}) {
  const { playlists, loading, error, reload } = usePlaylists();
  const [editing, setEditing] = useState<Editing>(null);

  async function remove(playlist: PlaylistSummary) {
    if (
      !window.confirm(
        `Delete “${playlist.nama}”? Screens using it will stop playing it.`,
      )
    )
      return;
    try {
      await api.playlists.remove(playlist.id);
      notify("Playlist deleted");
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete", "error");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-3">
            <ListMusic className="h-7 w-7 text-blue-400" />
            Playlists
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Organize media into ordered continuous loops and attach them to any screen.
          </p>
        </div>
        <button className={btnPrimary} onClick={() => setEditing({})}>
          <Plus className="h-4 w-4" />
          <span>New Playlist</span>
        </button>
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-white/5 bg-zinc-900/50"
            />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <EmptyState
          title="No playlists created yet"
          hint="A playlist plays multiple media assets sequentially on repeat. Create your first playlist and assign it to a screen."
          action={
            <button className={btnPrimary} onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" />
              <span>Create Playlist</span>
            </button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-blue-500/10 text-blue-400">
                      <ListMusic className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-100 text-base group-hover:text-blue-400 transition-colors">
                        {p.nama}
                      </h3>
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <Clock className="h-3 w-3" />
                        Updated {formatDateTime(p.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                    <Layers className="h-3.5 w-3.5" />
                    {p.item_count} {p.item_count === 1 ? "media slide" : "media slides"}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-1.5 border-t border-white/[0.08] pt-3">
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition"
                  onClick={() => setEditing({ playlist: p })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Sequence</span>
                </button>
                <button
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition"
                  onClick={() => remove(p)}
                  title="Delete playlist"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <PlaylistEditorModal
          playlist={editing.playlist}
          onClose={() => setEditing(null)}
          onSaved={() => {
            notify(editing.playlist ? "Playlist updated" : "Playlist created");
            setEditing(null);
            reload();
          }}
        />
      )}
    </section>
  );
}

