import { EventEmitter } from "node:events";
import type { Device } from "@signage/shared";

/**
 * Event bus internal. Layer REST memancarkan event, WebSocket server (tahap 3)
 * mendengarkan dan meneruskannya ke dashboard/device. Dengan begini modul REST
 * tidak perlu tahu apa-apa soal WebSocket.
 */
interface AppEvents {
  "device:changed": [device: Device];
  "device:removed": [deviceId: string];
  "device:token_rotated": [deviceId: string];
  /** Playlist yang dipakai sebuah device berganti */
  "device:playlist_changed": [deviceId: string];
  /** Isi sebuah playlist berubah (item diganti, atau konten di dalamnya diubah/dihapus) */
  "playlist:changed": [playlistId: string];
}

export const events = new EventEmitter<AppEvents>();
