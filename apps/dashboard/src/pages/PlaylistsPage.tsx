import { useState } from "react";
import type { PlaylistSummary } from "@signage/shared";
import { EmptyState, Spinner, btnGhost, btnPrimary } from "../components/ui";
import type { ToastKind } from "../components/ui";
import { usePlaylists } from "../hooks/usePlaylists";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { PlaylistEditorModal } from "./PlaylistEditorModal";

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
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Playlists
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Assign a playlist to a screen from Devices → Edit.
          </p>
        </div>
        <button className={btnPrimary} onClick={() => setEditing({})}>
          + New playlist
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Spinner /> Loading…
        </div>
      ) : playlists.length === 0 ? (
        <EmptyState
          title="No playlists yet"
          hint="A playlist plays several contents one after another, on repeat. Create one, then assign it to a screen."
          action={
            <button className={btnPrimary} onClick={() => setEditing({})}>
              + New playlist
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/70 text-xs font-medium text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Last updated</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {playlists.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {p.nama}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.item_count}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {formatDateTime(p.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-0.5">
                      <button
                        className={btnGhost}
                        onClick={() => setEditing({ playlist: p })}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
                        onClick={() => remove(p)}
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
