import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DeviceStatus } from "@signage/shared";
import type { ConnectionState } from "@signage/client";

// ---------- Kelas Tailwind yang dipakai berulang ----------
const btn =
  "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = `${btn} bg-blue-600 text-white hover:bg-blue-700`;
export const btnSecondary = `${btn} border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`;
export const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-700`;
export const btnGhost =
  "rounded-md px-2.5 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-600";
export const inputClass =
  "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";

// ---------- Status device ----------
export function StatusBadge({ status }: { status: DeviceStatus }) {
  const online = status === "online";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        online
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15"
          : "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/10"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-zinc-400"}`}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}

// ---------- Status koneksi dashboard ke server ----------
export function ConnectionPill({ state }: { state: ConnectionState }) {
  const map: Record<
    ConnectionState,
    { label: string; dot: string; text: string }
  > = {
    open: { label: "Live", dot: "bg-emerald-500", text: "text-emerald-700" },
    connecting: {
      label: "Connecting…",
      dot: "bg-amber-400 animate-pulse",
      text: "text-amber-700",
    },
    reconnecting: {
      label: "Reconnecting…",
      dot: "bg-amber-400 animate-pulse",
      text: "text-amber-700",
    },
    closed: { label: "Disconnected", dot: "bg-red-500", text: "text-red-700" },
  };
  const { label, dot, text } = map[state];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium ${text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ---------- Modal ----------
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1 rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            >
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-xs text-zinc-500">{hint}</span>
      )}
    </label>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {message}
    </p>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      {hint && <p className="max-w-sm text-sm text-zinc-500">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600" />
  );
}

// ---------- Toast ----------
export type ToastKind = "success" | "error";
interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback((message: string, kind: ToastKind = "success") => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), message, kind });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, notify };
}

export function ToastView({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      key={toast.id}
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-2.5 rounded-md px-4 py-3 text-sm font-medium text-white shadow-lg ${
        toast.kind === "success" ? "bg-zinc-900" : "bg-red-600"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          toast.kind === "success" ? "bg-emerald-400" : "bg-white/80"
        }`}
      />
      {toast.message}
    </div>
  );
}

/** Re-render berkala supaya teks "5 min ago" ikut berubah */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
