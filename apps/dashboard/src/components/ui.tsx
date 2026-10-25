import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DeviceStatus } from "@signage/shared";
import type { ConnectionState } from "@signage/client";
import { X, CheckCircle2, AlertCircle, LucideIcon } from "lucide-react";

// ---------- Kelas Tailwind yang dipakai berulang ----------
const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]";

export const btnPrimary = `${btn} bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] hover:bg-[position:right_center] text-white shadow-lg shadow-indigo-500/25 border border-blue-400/30`;
export const btnSecondary = `${btn} bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/70 text-zinc-200 hover:text-white shadow-sm`;
export const btnDanger = `${btn} bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-500/20 border border-red-500/30`;
export const btnGhost =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:bg-zinc-800/80 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40";

export const inputClass =
  "block w-full rounded-lg border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition-all placeholder:text-zinc-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15";

// ---------- Status device ----------
export function StatusBadge({ status }: { status: DeviceStatus }) {
  const online = status === "online";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide ${
        online
          ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
          : "bg-zinc-800/80 text-zinc-400 ring-1 ring-inset ring-zinc-700/50"
      }`}
    >
      <span className="relative flex h-2 w-2">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            online ? "bg-emerald-400" : "bg-zinc-500"
          }`}
        />
      </span>
      {online ? "Online" : "Offline"}
    </span>
  );
}

// ---------- Status koneksi dashboard ke server ----------
export function ConnectionPill({ state }: { state: ConnectionState }) {
  const map: Record<
    ConnectionState,
    { label: string; dot: string; text: string; bg: string; ring: string }
  > = {
    open: {
      label: "Realtime Live",
      dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
      text: "text-emerald-300",
      bg: "bg-emerald-950/40",
      ring: "ring-emerald-500/30",
    },
    connecting: {
      label: "Connecting…",
      dot: "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]",
      text: "text-amber-300",
      bg: "bg-amber-950/40",
      ring: "ring-amber-500/30",
    },
    reconnecting: {
      label: "Reconnecting…",
      dot: "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]",
      text: "text-amber-300",
      bg: "bg-amber-950/40",
      ring: "ring-amber-500/30",
    },
    closed: {
      label: "Offline",
      dot: "bg-red-400",
      text: "text-red-300",
      bg: "bg-red-950/40",
      ring: "ring-red-500/30",
    },
  };
  const { label, dot, text, bg, ring } = map[state];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full ${bg} ring-1 ${ring} px-3 py-1 text-xs font-medium ${text} backdrop-blur-md`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
    </span>
  );
}

// ---------- KPI Stat Card ----------
export function StatCard({
  title,
  value,
  subvalue,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string | number;
  subvalue?: string;
  icon: LucideIcon;
  gradient?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 backdrop-blur-xl shadow-xl transition-all duration-300 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/5">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl opacity-20 transition-opacity duration-300 group-hover:opacity-35 ${
          gradient ?? "bg-blue-500"
        }`}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {value}
          </p>
          {subvalue && (
            <p className="mt-1 text-xs text-zinc-400 flex items-center gap-1.5">
              {subvalue}
            </p>
          )}
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-200 transition-colors group-hover:border-blue-500/30 group-hover:text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${
          wide ? "max-w-2xl" : "max-w-md"
        } max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 shadow-2xl text-zinc-100 ring-1 ring-white/10`}
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <h2 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
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
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-300">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-xs text-zinc-400">{hint}</span>
      )}
    </label>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300"
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
      <span>{message}</span>
    </div>
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
    <div className="relative flex flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent opacity-50" />
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400 shadow-inner">
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="14" x="3" y="3" rx="2" />
          <path d="M12 17v4M8 21h8" />
        </svg>
      </div>
      <p className="mt-2 text-base font-semibold text-white">{title}</p>
      {hint && <p className="max-w-sm text-sm text-zinc-400">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
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
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur-xl border ${
        toast.kind === "success"
          ? "border-emerald-500/30 bg-zinc-900/95 ring-1 ring-emerald-500/20"
          : "border-red-500/40 bg-red-950/95 ring-1 ring-red-500/30"
      }`}
    >
      {toast.kind === "success" ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
      ) : (
        <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
      )}
      <span>{toast.message}</span>
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

