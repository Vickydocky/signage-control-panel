import type { ContentType } from './index';

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB (sinkron dengan bucket Supabase)

/** MIME type yang diizinkan untuk upload -> tipe konten + ekstensi file */
export const UPLOAD_MIME_TYPES: Record<string, { tipe: ContentType; ext: string }> = {
  'image/jpeg': { tipe: 'image', ext: 'jpg' },
  'image/png': { tipe: 'image', ext: 'png' },
  'image/webp': { tipe: 'image', ext: 'webp' },
  'image/gif': { tipe: 'image', ext: 'gif' },
  'video/mp4': { tipe: 'video', ext: 'mp4' },
  'video/webm': { tipe: 'video', ext: 'webm' },
};

export const ACCEPTED_UPLOAD_MIME = Object.keys(UPLOAD_MIME_TYPES);
