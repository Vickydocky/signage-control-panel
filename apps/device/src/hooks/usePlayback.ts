import { useEffect, useMemo, useState } from "react";
import type { PlaylistEntry } from "@signage/shared";
import type { Shown } from "./useDeviceSocket";

/** Sidik jari isi playlist: berubah jika item, urutan, durasi, atau isi kontennya berubah */
export function playlistSignature(playlist: PlaylistEntry[]): string {
  return playlist
    .map((e) => `${e.content.id}@${e.content.updated_at}x${e.duration_seconds}`)
    .join("|");
}

/**
 * Menentukan apa yang tampil:
 *  1. konten hasil push (jika ada) selalu menang
 *  2. kalau tidak, playlist diputar bergantian sesuai durasi masing-masing, berulang terus
 */
export function usePlayback(
  playlist: PlaylistEntry[],
  pushed: Shown | null,
): Shown | null {
  const [index, setIndex] = useState(0);
  const signature = useMemo(() => playlistSignature(playlist), [playlist]);

  // Playlist berbeda: mulai lagi dari item pertama
  useEffect(() => setIndex(0), [signature]);

  // Indeks bisa sesaat melebihi panjang playlist yang baru mengecil, jadi dibatasi
  const current = playlist.length > 0 ? index % playlist.length : 0;

  // Satu item tidak perlu berpindah. Saat ada push, putaran dijeda dan dihitung ulang setelah push selesai.
  useEffect(() => {
    if (pushed || playlist.length < 2) return;
    const timer = setTimeout(
      () => setIndex((i) => (i + 1) % playlist.length),
      playlist[current].duration_seconds * 1000,
    );
    return () => clearTimeout(timer);
  }, [pushed, playlist, current]);

  if (pushed) return pushed;
  const entry = playlist[current];
  return entry
    ? { content: entry.content, key: `${signature}#${current}` }
    : null;
}
