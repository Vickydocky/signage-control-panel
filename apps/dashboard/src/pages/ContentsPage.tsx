import { useCallback, useEffect, useState } from "react";
import type { Content, ContentType } from "@signage/shared";
import { EmptyState, Spinner, btnPrimary } from "../components/ui";
import type { ToastKind } from "../components/ui";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { AddContentModal } from "./AddContentModal";
import {
  FolderKanban,
  Plus,
  Image,
  Film,
  FileText,
  Globe,
  Trash2,
  ExternalLink,
  Layers,
} from "lucide-react";

const FILTERS: { value: ContentType | "all"; label: string; icon: typeof Layers }[] = [
  { value: "all", label: "All Media", icon: Layers },
  { value: "image", label: "Images", icon: Image },
  { value: "video", label: "Videos", icon: Film },
  { value: "text", label: "Text Slides", icon: FileText },
  { value: "url", label: "Web Pages", icon: Globe },
];

function Preview({ content }: { content: Content }) {
  if (content.tipe === "image") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-black/60 group">
        <img
          src={content.payload}
          alt={content.judul}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      </div>
    );
  }
  if (content.tipe === "video") {
    return (
      <div className="relative h-full w-full bg-black/80 flex items-center justify-center">
        <video
          src={content.payload}
          muted
          controls
          preload="metadata"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  if (content.tipe === "text") {
    return (
      <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950/60 via-zinc-900 to-black p-5 text-zinc-200">
        <div className="pointer-events-none absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-blue-500/10 blur-xl" />
        <span className="text-2xl font-serif text-blue-400/40 select-none">“</span>
        <p className="line-clamp-4 text-xs font-medium leading-relaxed tracking-wide text-zinc-200">
          {content.payload}
        </p>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
          Text Broadcast
        </span>
      </div>
    );
  }
  return (
    <div className="relative flex h-full w-full flex-col bg-zinc-950 p-3">
      {/* Mock Browser Header */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 mb-2">
        <span className="h-2 w-2 rounded-full bg-red-500/80" />
        <span className="h-2 w-2 rounded-full bg-amber-500/80" />
        <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
        <span className="ml-2 truncate text-[10px] text-zinc-500 font-mono">
          {content.payload}
        </span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-2">
        <Globe className="h-7 w-7 text-blue-400" />
        <a
          href={content.payload}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline max-w-[90%] truncate font-medium"
        >
          <span className="truncate">{content.payload}</span>
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </div>
    </div>
  );
}

export function ContentsPage({
  notify,
}: {
  notify: (message: string, kind?: ToastKind) => void;
}) {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ContentType | "all">("all");
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    api.contents
      .list()
      .then((res) => {
        setContents(res.data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function remove(content: Content) {
    if (!window.confirm(`Delete “${content.judul}”?`)) return;
    try {
      await api.contents.remove(content.id);
      setContents((prev) => prev.filter((c) => c.id !== content.id));
      notify("Content deleted");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to delete", "error");
    }
  }

  const visible = contents.filter((c) => filter === "all" || c.tipe === filter);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-3">
            <FolderKanban className="h-7 w-7 text-indigo-400" />
            Media Library
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Store images, videos, live text announcements, and dynamic web pages for your screens.
          </p>
        </div>
        <button className={btnPrimary} onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          <span>Upload / Add Media</span>
        </button>
      </div>

      {/* Filter Tabs */}
      {contents.length > 0 && (
        <div
          role="group"
          aria-label="Filter by type"
          className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-zinc-900/60 p-1.5 backdrop-blur-xl"
        >
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const active = filter === f.value;
            const count =
              f.value === "all"
                ? contents.length
                : contents.filter((c) => c.tipe === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{f.label}</span>
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                    active ? "bg-white/20 text-white" : "bg-white/5 text-zinc-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

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
              className="h-64 animate-pulse rounded-2xl border border-white/5 bg-zinc-900/50"
            />
          ))}
        </div>
      ) : contents.length === 0 ? (
        <EmptyState
          title="No media assets uploaded yet"
          hint="Upload an image, video, dynamic web page URL, or text slide to show on your signage displays."
          action={
            <button className={btnPrimary} onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
              <span>Add First Media</span>
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No items in this category" />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <li
              key={c.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1"
            >
              <div className="relative h-44 overflow-hidden border-b border-white/[0.08] bg-black">
                <Preview content={c} />
              </div>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="min-w-0 truncate font-semibold text-zinc-100 text-sm group-hover:text-blue-400 transition-colors"
                      title={c.judul}
                    >
                      {c.judul}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        c.tipe === "image"
                          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                          : c.tipe === "video"
                          ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                          : c.tipe === "text"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {c.tipe}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    Added {formatDateTime(c.created_at)}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className="font-mono text-[10px] text-zinc-400 truncate max-w-[150px]">
                    {c.id.slice(0, 12)}…
                  </span>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/15 hover:text-red-300 transition"
                    onClick={() => remove(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddContentModal
          onClose={() => setAdding(false)}
          onSaved={(saved) => {
            setContents((prev) => [saved, ...prev]);
            setAdding(false);
            notify("Content added to library");
          }}
        />
      )}
    </section>
  );
}

