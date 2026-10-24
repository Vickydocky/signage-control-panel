import { useCallback, useEffect, useState } from "react";
import type { Content, ContentType } from "@signage/shared";
import { EmptyState, Spinner, btnGhost, btnPrimary } from "../components/ui";
import type { ToastKind } from "../components/ui";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { AddContentModal } from "./AddContentModal";

const FILTERS: { value: ContentType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "text", label: "Text" },
  { value: "url", label: "Web pages" },
];

function Preview({ content }: { content: Content }) {
  if (content.tipe === "image") {
    return (
      <img
        src={content.payload}
        alt={content.judul}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    );
  }
  if (content.tipe === "video") {
    return (
      <video
        src={content.payload}
        muted
        controls
        preload="metadata"
        className="h-full w-full object-cover"
      />
    );
  }
  if (content.tipe === "text") {
    return (
      <p className="line-clamp-5 p-4 text-sm text-slate-700">
        {content.payload}
      </p>
    );
  }
  return (
    <a
      href={content.payload}
      target="_blank"
      rel="noreferrer noopener"
      className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center text-sm text-indigo-600 hover:underline"
    >
      <span className="text-2xl">🌐</span>
      <span className="line-clamp-2 break-all">{content.payload}</span>
    </a>
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
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contents</h1>
          <p className="mt-1 text-sm text-slate-500">
            {contents.length} item{contents.length === 1 ? "" : "s"}
          </p>
        </div>
        <button className={btnPrimary} onClick={() => setAdding(true)}>
          + Add content
        </button>
      </div>

      {contents.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                filter === f.value
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner /> Loading…
        </div>
      ) : contents.length === 0 ? (
        <EmptyState
          title="No content yet"
          hint="Add text, a web page, or upload an image or video to show on your screens."
          action={
            <button className={btnPrimary} onClick={() => setAdding(true)}>
              + Add content
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState title="Nothing in this category" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <li
              key={c.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="h-40 overflow-hidden bg-slate-100">
                <Preview content={c} />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="min-w-0 truncate font-medium text-slate-900"
                    title={c.judul}
                  >
                    {c.judul}
                  </h3>
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase text-slate-600">
                    {c.tipe}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {formatDateTime(c.created_at)}
                </p>
                <div className="mt-2 flex justify-end">
                  <button
                    className={`${btnGhost} text-red-600 hover:bg-red-50`}
                    onClick={() => remove(c)}
                  >
                    Delete
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
            notify("Content added");
          }}
        />
      )}
    </section>
  );
}
