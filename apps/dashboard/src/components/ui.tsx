import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DeviceStatus } from "@signage/shared";
import type { ConnectionState } from '@signage/client';

// ---------- Kelas Tailwind yang dipakai berulang ----------
const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = `${btn} bg-indigo-600 text-white hover:bg-indigo-500`;
export const btnSecondary = `${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
export const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-500`;
export const btnGhost =
  "rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";
export const inputClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

// ---------- Status device ----------
export function StatusBadge({ status }: { status: DeviceStatus }) {
  const online = status === "online";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        online
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`}
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
      className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium ${text}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ---------- Modal ----------
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
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
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
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
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="text-base font-medium text-slate-900">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
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
      className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
        toast.kind === "success" ? "bg-slate-900" : "bg-red-600"
      }`}
    >
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
