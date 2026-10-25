import { useEffect, useRef, useState } from "react";
import { type ConnectionState, connectSocket } from "@signage/client";
import {
  type Content,
  type Device,
  type PlaylistEntry,
  type ServerToDeviceMessage,
  WS_CLOSE,
} from "@signage/shared"; // BERUBAH: tambah PlaylistEntry
import { type Credentials, toWsUrl } from "../lib/config";
import { playlistSignature, usePlayback } from "./usePlayback"; // BARU

export interface Shown {
  content: Content;
  /** Berubah setiap konten baru muncul, supaya animasi masuk berulang (push yang sama dua kali pun) */
  key: string | number; // BERUBAH: sebelumnya number saja
}

export interface DeviceSocket {
  connection: ConnectionState;
  device: Device | null;
  /** null = tidak ada konten aktif (layar menunggu) */
  shown: Shown | null;
  /** Alasan koneksi dihentikan permanen; null jika normal */
  problem: string | null;
}

function describeClose(code: number): string {
  switch (code) {
    case WS_CLOSE.UNAUTHORIZED:
      return "The Device ID or token is wrong.";
    case WS_CLOSE.TOKEN_ROTATED:
      return "The token for this device was changed. Enter the new token.";
    case WS_CLOSE.DEVICE_REMOVED:
      return "This device was removed from the control panel.";
    case WS_CLOSE.REPLACED:
      return "Another screen is now using this device.";
    default:
      return "The connection settings are invalid.";
  }
}

/** Menyambung ke server sebagai device, dan mengubah pesan server menjadi state tampilan */
export function useDeviceSocket(credentials: Credentials): DeviceSocket {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [device, setDevice] = useState<Device | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistEntry[]>([]); // BARU
  const [pushed, setPushed] = useState<Shown | null>(null); // BERUBAH: dulu bernama `shown`
  const [problem, setProblem] = useState<string | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { serverUrl, deviceId, token } = credentials;

  useEffect(() => {
    setProblem(null);
    setPushed(null);
    setPlaylist([]); // BARU

    // BARU: server mengirim ulang playlist yang sama setiap reconnect. Jangan ganti state kalau isinya
    // tidak berubah, supaya putaran yang sedang berjalan tidak terulang dari awal.
    const applyPlaylist = (next: PlaylistEntry[]) =>
      setPlaylist((prev) =>
        playlistSignature(prev) === playlistSignature(next) ? prev : next,
      );

    const socket = connectSocket({
      url: toWsUrl({ serverUrl, deviceId, token }),
      onStatus: setConnection,
      onClosed: (code) => setProblem(describeClose(code)),
      onMessage: (data) => {
        if (typeof data !== "object" || data === null || !("type" in data))
          return;
        const msg = data as ServerToDeviceMessage;

        switch (msg.type) {
          case "welcome":
            setDevice(msg.device);
            applyPlaylist(msg.playlist); // BARU
            break;
          case "playlist_updated": // BERUBAH: sebelumnya kosong
            applyPlaylist(msg.playlist);
            break;
          case "push_content":
            clearTimeout(expiry.current);
            setPushed({ content: msg.content, key: Date.now() });
            // Dengan durasi: tampil sebentar lalu kembali ke playlist. Tanpa durasi: tampil sampai diganti.
            if (msg.duration_seconds) {
              expiry.current = setTimeout(
                () => setPushed(null),
                msg.duration_seconds * 1000,
              );
            }
            break;
          case "error":
            console.warn("Server:", msg.message);
            break;
        }
      },
    });

    return () => {
      socket.close();
      clearTimeout(expiry.current);
    };
  }, [serverUrl, deviceId, token]);

  const shown = usePlayback(playlist, pushed); // BARU

  return { connection, device, shown, problem };
}
