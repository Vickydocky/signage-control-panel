import { useEffect, useState } from "react";
import type { ConnectionState } from "@signage/client";
import { ContentView } from "./components/ContentView";
import { useDeviceSocket } from "./hooks/useDeviceSocket";
import type { Credentials } from "./lib/config";

/** true selama `ms` setelah gerakan mouse/sentuhan terakhir; dipakai untuk menyembunyikan kursor dan kontrol */
function useRecentActivity(ms = 3000) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const wake = () => {
      setActive(true);
      clearTimeout(timer);
      timer = setTimeout(() => setActive(false), ms);
    };
    window.addEventListener("mousemove", wake);
    window.addEventListener("touchstart", wake);
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("touchstart", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [ms]);

  return active;
}

const DOT: Record<ConnectionState, string> = {
  open: "bg-emerald-500",
  connecting: "bg-amber-400 animate-pulse",
  reconnecting: "bg-amber-400 animate-pulse",
  closed: "bg-red-500",
};

function ProblemScreen({
  message,
  onReconfigure,
}: {
  message: string;
  onReconfigure: () => void;
}) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center">
      <p className="text-2xl font-semibold text-white">
        This screen is disconnected
      </p>
      <p className="max-w-md text-slate-400">{message}</p>
      <button
        onClick={onReconfigure}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Change connection settings
      </button>
    </div>
  );
}

export function Player({
  credentials,
  onReconfigure,
}: {
  credentials: Credentials;
  onReconfigure: () => void;
}) {
  const { connection, device, shown, problem } = useDeviceSocket(credentials);
  const active = useRecentActivity();

  if (problem)
    return <ProblemScreen message={problem} onReconfigure={onReconfigure} />;

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else
      void document.documentElement.requestFullscreen().catch(() => undefined);
  }

  function disconnect() {
    if (window.confirm("Disconnect this screen and forget its settings?"))
      onReconfigure();
  }

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden bg-black ${active ? "" : "cursor-none"}`}
    >
      {shown ? (
        <ContentView key={shown.key} content={shown.content} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <p className="text-3xl font-semibold text-slate-200">
            {device?.nama ?? "Connecting…"}
          </p>
          {device?.lokasi && (
            <p className="text-lg text-slate-500">{device.lokasi}</p>
          )}
          <p className="mt-6 text-sm uppercase tracking-widest text-slate-600">
            {connection === "open"
              ? "Waiting for content"
              : "Connecting to server"}
          </p>
        </div>
      )}

      {connection !== "open" && (
        <div
          role="status"
          className="absolute inset-x-0 top-0 bg-amber-500/90 px-4 py-1.5 text-center text-sm font-medium text-amber-950"
        >
          {connection === "connecting"
            ? "Connecting…"
            : "Connection lost. Reconnecting…"}
        </div>
      )}

      <span
        title={connection}
        className={`absolute bottom-3 left-3 h-2.5 w-2.5 rounded-full opacity-70 ${DOT[connection]}`}
      />

      <div
        className={`absolute right-3 top-3 flex gap-2 transition-opacity ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <button
          onClick={toggleFullscreen}
          className="rounded-lg bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
        >
          Fullscreen
        </button>
        <button
          onClick={disconnect}
          className="rounded-lg bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
