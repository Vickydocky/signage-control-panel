import { useCallback, useEffect, useRef, useState } from "react";
import { type Device, type ServerToDashboardMessage, WS_CLOSE } from '@signage/shared';
import { WS_URL, api } from "../lib/api";
import { type ConnectionState, type ReconnectingSocket, connectSocket } from '@signage/client';

export interface UseDevices {
  devices: Device[];
  loading: boolean;
  error: string | null;
  connection: ConnectionState;
  /** false jika dashboard sedang tidak terhubung ke server */
  pushContent: (
    deviceId: string,
    contentId: string,
    durationSeconds?: number,
  ) => boolean;
}

/**
 * Daftar device yang selalu up-to-date:
 *  1. REST: data awal supaya halaman cepat tampil
 *  2. WebSocket: `snapshot` menggantikan data awal, lalu event real-time menjaganya tetap segar
 */
export function useDevices(
  token: string,
  onServerError: (message: string) => void,
  onSessionEnded: () => void,
): UseDevices {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");

  const socketRef = useRef<ReconnectingSocket | null>(null);
  const gotSnapshot = useRef(false);
  // Simpan callback di ref agar socket tidak disambung ulang setiap callback berubah
  const onErrorRef = useRef(onServerError);
  onErrorRef.current = onServerError;
  const onSessionEndedRef = useRef(onSessionEnded);
  onSessionEndedRef.current = onSessionEnded;

  // 1) Data awal lewat REST
  useEffect(() => {
    api.devices
      .list()
      .then((res) => {
        if (!gotSnapshot.current) setDevices(res.data); // jangan timpa snapshot yang lebih baru
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // 2) Real-time lewat WebSocket
  useEffect(() => {
    const handle = (msg: ServerToDashboardMessage) => {
      switch (msg.type) {
        case "snapshot":
          gotSnapshot.current = true;
          setDevices(msg.devices);
          setError(null);
          setLoading(false);
          break;
        case "device_status":
          setDevices((prev) =>
            prev.map((d) =>
              d.id === msg.deviceId
                ? { ...d, status: msg.status, last_seen: msg.last_seen }
                : d,
            ),
          );
          break;
        case "device_changed":
          setDevices((prev) =>
            prev.some((d) => d.id === msg.device.id)
              ? prev.map((d) => (d.id === msg.device.id ? msg.device : d))
              : [...prev, msg.device],
          );
          break;
        case "device_removed":
          setDevices((prev) => prev.filter((d) => d.id !== msg.deviceId));
          break;
        case "error":
          onErrorRef.current(msg.message);
          break;
      }
    };

    const socket = connectSocket({
      url: `${WS_URL}?${new URLSearchParams({ role: 'dashboard', token })}`,
      onStatus: setConnection,
      // Server menolak atau mengakhiri sesi (token tidak sah / kedaluwarsa): kembali ke halaman login
      onClosed: (code) => {
        if (code === WS_CLOSE.UNAUTHORIZED) onSessionEndedRef.current();
      },
      onMessage: (data) => {
        if (typeof data === "object" && data !== null && "type" in data) {
          handle(data as ServerToDashboardMessage);
        }
      },
    });
    socketRef.current = socket;
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [token]);

  const pushContent = useCallback(
    (deviceId: string, contentId: string, durationSeconds?: number) =>
      socketRef.current?.send({
        type: "push_content",
        deviceId,
        contentId,
        duration_seconds: durationSeconds,
      }) ?? false,
    [],
  );

  return { devices, loading, error, connection, pushContent };
}
