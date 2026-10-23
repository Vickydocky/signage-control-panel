import type { ContentType } from "./index";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB (sinkron dengan bucket Supabase)
export const WS_PATH = "/ws";

/** MIME type yang diizinkan untuk upload -> tipe konten + ekstensi file */
export const UPLOAD_MIME_TYPES: Record<
  string,
  { tipe: ContentType; ext: string }
> = {
  "image/jpeg": { tipe: "image", ext: "jpg" },
  "image/png": { tipe: "image", ext: "png" },
  "image/webp": { tipe: "image", ext: "webp" },
  "image/gif": { tipe: "image", ext: "gif" },
  "video/mp4": { tipe: "video", ext: "mp4" },
  "video/webm": { tipe: "video", ext: "webm" },
};

export const WS_CLOSE = {
  /** Koneksi baru dari device yang sama menggantikan koneksi ini */
  REPLACED: 4000,
  /** Device dihapus oleh admin */
  DEVICE_REMOVED: 4001,
  /** Token device diganti oleh admin */
  TOKEN_ROTATED: 4002,
  /** Parameter koneksi tidak valid */
  BAD_REQUEST: 4400,
  /** Kredensial salah */
  UNAUTHORIZED: 4401,
} as const;

/**
 * Close code yang berarti "jangan reconnect otomatis": mencoba lagi tidak akan membantu
 * (token salah, device dihapus, dst) dan reconnect pada REPLACED bisa memicu perebutan koneksi.
 */
export const WS_NO_RECONNECT_CODES: number[] = Object.values(WS_CLOSE);

export const ACCEPTED_UPLOAD_MIME = Object.keys(UPLOAD_MIME_TYPES);
