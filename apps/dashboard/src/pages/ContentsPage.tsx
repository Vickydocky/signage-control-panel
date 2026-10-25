import { useCallback, useEffect, useState } from "react";
import type { Content, ContentType } from "@signage/shared";
import { EmptyState, Spinner, btnPrimary } from "../components/ui";
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
      <p className="line-clamp-5 p-4 text-sm leading-relaxed text-zinc-700">
        {content.payload}
      </p>
    );
  }
  return (
    <a
      href={content.payload}
      target="_blank"
      rel="noreferrer noopener"
      className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-blue-600 hover:underline"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-6 w-6 text-zinc-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
      </svg>
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Contents
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {contents.length} item{contents.length === 1 ? "" : "s"}
          </p>
        </div>
        <button className={btnPrimary} onClick={() => setAdding(true)}>
          + Add content
        </button>
      </div>

      {contents.length > 0 && (
        <div
          role="group"
          aria-label="Filter by type"
          className="mb-5 inline-flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                filter === f.value
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
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
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
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
              className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-zinc-300"
            >
              <div className="h-40 overflow-hidden border-b border-zinc-100 bg-zinc-100">
                <Preview content={c} />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="min-w-0 truncate text-sm font-medium text-zinc-900"
                    title={c.judul}
                  >
                    {c.judul}
                  </h3>
                  <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
                    {c.tipe}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  {formatDateTime(c.created_at)}
                </p>
                <div className="mt-2 flex justify-end">
                  <button
                    className="rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
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
