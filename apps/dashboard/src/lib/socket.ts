import { WS_NO_RECONNECT_CODES } from "@signage/shared";

export type ConnectionState = "connecting" | "open" | "reconnecting" | "closed";

interface Options {
  url: string;
  onMessage: (data: unknown) => void;
  onStatus: (state: ConnectionState) => void;
}

export interface ReconnectingSocket {
  /** false jika koneksi sedang tidak terbuka */
  send: (data: unknown) => boolean;
  close: () => void;
}

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;
const CONNECT_TIMEOUT_MS = 10_000;

/**
 * WebSocket yang otomatis menyambung ulang dengan exponential backoff + jitter:
 * jeda 1s, 2s, 4s, ... maksimal 30s, masing-masing diacak separuhnya supaya ratusan klien
 * tidak serentak menyerbu server begitu server hidup kembali.
 */
export function connectSocket({
  url,
  onMessage,
  onStatus,
}: Options): ReconnectingSocket {
  let ws: WebSocket | null = null;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const open = () => {
    onStatus(attempt === 0 ? "connecting" : "reconnecting");
    const socket = new WebSocket(url);
    ws = socket;
    let down = false; // socket ini sudah dianggap gagal/putus (cegah penjadwalan ganda)

    // Koneksi yang menggantung (jaringan "blackhole") dianggap gagal setelah 10 detik
    const connectTimer = setTimeout(() => {
      fail();
      socket.close();
    }, CONNECT_TIMEOUT_MS);

    const fail = (code?: number) => {
      if (down) return;
      down = true;
      clearTimeout(connectTimer);
      if (ws === socket) ws = null;
      if (stopped) return;

      // Mencoba lagi tidak akan membantu (token salah, dst): berhenti
      if (code !== undefined && WS_NO_RECONNECT_CODES.includes(code)) {
        onStatus("closed");
        return;
      }

      const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
      const delay = ceiling / 2 + Math.random() * (ceiling / 2);
      attempt += 1;
      onStatus("reconnecting");
      retryTimer = setTimeout(open, delay);
    };

    socket.onopen = () => {
      if (down || stopped) return;
      clearTimeout(connectTimer);
      attempt = 0; // koneksi sehat: backoff mulai dari awal lagi
      onStatus("open");
    };

    socket.onmessage = (event) => {
      if (down) return;
      try {
        onMessage(JSON.parse(String(event.data)));
      } catch {
        /* pesan bukan JSON: abaikan */
      }
    };

    // Koneksi gagal dibuat (server mati, ditolak): sebagian lingkungan hanya memicu 'error'
    socket.onerror = () => fail();
    socket.onclose = (event) => fail(event.code);
  };

  open();

  return {
    send(data) {
      if (ws?.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify(data));
      return true;
    },
    close() {
      stopped = true;
      clearTimeout(retryTimer);
      ws?.close();
    },
  };
}
