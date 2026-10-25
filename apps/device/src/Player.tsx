import { useEffect, useState } from "react";
import type { ConnectionState } from "@signage/client";
import { ContentView } from "./components/ContentView";
import { useDeviceSocket } from "./hooks/useDeviceSocket";
import type { Credentials } from "./lib/config";
import { Tv, Maximize2, Minimize2, PowerOff, AlertCircle, Wifi, WifiOff } from "lucide-react";

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
  open: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]",
  connecting: "bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]",
  reconnecting: "bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]",
  closed: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]",
};

const controlBtn =
  "inline-flex items-center gap-1.5 rounded-xl bg-zinc-900/85 px-3 py-1.5 text-xs font-medium text-zinc-200 ring-1 ring-inset ring-white/10 backdrop-blur-md transition hover:bg-zinc-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500";

function ProblemScreen({
  message,
  onReconfigure,
}: {
  message: string;
  onReconfigure: () => void;
}) {
  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center bg-[#070b12] p-6 text-center overflow-hidden">
      <div className="pointer-events-none absolute h-[400px] w-[400px] rounded-full bg-red-600/10 blur-[120px]" />
      <span
        aria-hidden="true"
        className="grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 ring-1 ring-inset ring-red-500/30 text-red-400 mb-2"
      >
        <AlertCircle className="h-8 w-8" />
      </span>
      <div>
        <p className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Screen Disconnected
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">{message}</p>
      </div>
      <button
        onClick={onReconfigure}
        className="mt-6 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500 active:scale-[0.98]"
      >
        Reconfigure Connection Settings
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
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  if (problem)
    return <ProblemScreen message={problem} onReconfigure={onReconfigure} />;

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }

  function disconnect() {
    if (window.confirm("Disconnect this screen and forget its settings?"))
      onReconfigure();
  }

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden bg-black select-none ${
        active ? "" : "cursor-none"
      }`}
    >
      {shown ? (
        <ContentView key={shown.key} content={shown.content} />
      ) : (
        /* Futuristic Standby / Waiting Screen */
        <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#090d16] via-black to-[#090d16] px-6 text-center overflow-hidden">
          {/* Subtle concentric radar waves */}
          <div className="pointer-events-none absolute flex items-center justify-center">
            <div className="h-[500px] w-[500px] rounded-full border border-blue-500/10 animate-ping opacity-25" style={{ animationDuration: "6s" }} />
            <div className="h-[340px] w-[340px] rounded-full border border-indigo-500/15" />
            <div className="h-[200px] w-[200px] rounded-full border border-blue-500/20" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-[1px] shadow-2xl shadow-blue-500/30">
              <div className="flex h-full w-full items-center justify-center rounded-[15px] bg-zinc-950/90 backdrop-blur-md">
                <Tv className="h-8 w-8 text-blue-400" />
              </div>
            </div>

            <h1 className="text-[clamp(2rem,5vmin,4.5rem)] font-extrabold leading-tight tracking-tight text-white drop-shadow-sm">
              {device?.nama ?? "Connecting to Screen…"}
            </h1>
            {device?.lokasi && (
              <p className="mt-2 text-[clamp(1rem,2vmin,1.75rem)] text-zinc-400 font-medium">
                {device.lokasi}
              </p>
            )}

            <div className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-zinc-300 backdrop-blur-md shadow-lg">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${DOT[connection]}`}
              />
              <span className="font-medium">
                {connection === "open"
                  ? "Standby Mode • Waiting for Playlist Assignment"
                  : "Establishing Realtime Link…"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Reconnecting banner pill */}
      {connection !== "open" && (
        <div
          role="status"
          className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-zinc-900/90 px-4 py-1.5 text-xs font-semibold text-zinc-100 ring-1 ring-inset ring-white/10 backdrop-blur-md shadow-xl"
        >
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 animate-ping rounded-full bg-amber-400"
            />
            {connection === "connecting"
              ? "Connecting…"
              : "Reconnecting to server…"}
          </span>
        </div>
      )}

      {/* Tiny corner status indicator */}
      <span
        title={connection}
        className={`absolute bottom-3 left-3 h-2 w-2 rounded-full opacity-60 transition-opacity hover:opacity-100 ${DOT[connection]}`}
      />

      {/* Floating Kiosk Controls (auto-hide when idle) */}
      <div
        className={`absolute right-4 top-4 flex gap-2 transition-opacity duration-300 ${
          active ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button onClick={toggleFullscreen} className={controlBtn}>
          {isFullscreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" />
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Fullscreen</span>
            </>
          )}
        </button>
        <button onClick={disconnect} className={controlBtn}>
          <PowerOff className="h-3.5 w-3.5" />
          <span>Disconnect</span>
        </button>
      </div>
    </div>
  );
}

