import { WebSocket } from "ws";
import type {
  ServerToDashboardMessage,
  ServerToDeviceMessage,
} from "@signage/shared";

/** Satu koneksi yang sedang dilacak server */
export interface Tracked {
  ws: WebSocket;
  /** true = sudah membalas ping terakhir. Di-reset ke false setiap kali server mengirim ping. */
  isAlive: boolean;
  /** Hanya untuk koneksi device */
  deviceId?: string;
  /** Kapan terakhir kali last_seen ditulis ke DB (untuk throttling) */
  lastDbTouch: number;
  /** Hanya untuk dashboard: kapan JWT kedaluwarsa (ms). Koneksi ditutup setelahnya. */
  expiresAt?: number;
}

type Outgoing = ServerToDeviceMessage | ServerToDashboardMessage;

export function send(ws: WebSocket, msg: Outgoing): boolean {
  if (ws.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify(msg));
  return true;
}

/** Tutup dengan close frame; kalau lawan bicara tidak merespons dalam 3 detik, putus paksa */
export function closeGracefully(ws: WebSocket, code: number, reason: string) {
  if (ws.readyState === WebSocket.CLOSED) return;
  ws.close(code, reason);
  setTimeout(() => {
    if (ws.readyState !== WebSocket.CLOSED) ws.terminate();
  }, 3000).unref();
}

/**
 * Daftar koneksi yang aktif, disimpan di memori.
 *  - devices    : deviceId -> koneksi (maksimal 1 per device)
 *  - dashboards : semua koneksi admin
 */
export class Hub {
  private devices = new Map<string, Tracked>();
  private dashboards = new Set<Tracked>();

  /** Daftarkan koneksi device. Mengembalikan koneksi lama (jika ada) yang tergantikan. */
  setDevice(id: string, t: Tracked): Tracked | undefined {
    const previous = this.devices.get(id);
    this.devices.set(id, t);
    return previous;
  }

  /** Hapus hanya jika `t` masih koneksi aktif milik device itu (bukan yang sudah digantikan). */
  removeDevice(id: string, t: Tracked): boolean {
    if (this.devices.get(id) !== t) return false;
    this.devices.delete(id);
    return true;
  }

  isOnline(id: string): boolean {
    return this.devices.has(id);
  }

  addDashboard(t: Tracked) {
    this.dashboards.add(t);
  }

  removeDashboard(t: Tracked) {
    this.dashboards.delete(t);
  }

  broadcast(msg: ServerToDashboardMessage) {
    for (const d of this.dashboards) send(d.ws, msg);
  }

  sendToDevice(id: string, msg: ServerToDeviceMessage): boolean {
    const t = this.devices.get(id);
    return t ? send(t.ws, msg) : false;
  }

  closeDevice(id: string, code: number, reason: string) {
    const t = this.devices.get(id);
    if (t) closeGracefully(t.ws, code, reason);
  }

  all(): Tracked[] {
    return [...this.devices.values(), ...this.dashboards];
  }

  stats() {
    return { devices: this.devices.size, dashboards: this.dashboards.size };
  }
}
