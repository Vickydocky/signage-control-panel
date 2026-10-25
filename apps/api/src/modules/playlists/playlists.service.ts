import type {
  Content,
  CreatePlaylistInput,
  Playlist,
  PlaylistDetail,
  PlaylistEntry,
  PlaylistSummary,
  UpdatePlaylistInput,
} from "@signage/shared";
import { replacePlaylistItemsSchema } from "@signage/shared";
import type { z } from "zod";
import { badRequest, fromDbError, notFound } from "../../lib/errors";
import { events } from "../../lib/events";
import { supabase } from "../../lib/supabase";
import {
  getDeviceIdsByPlaylist,
  getDevicePublic,
} from "../devices/devices.service";

const COLUMNS = "id,nama,created_at,updated_at";
const CONTENT_COLUMNS =
  "id,judul,tipe,payload,storage_path,created_at,updated_at";

type ReplaceItems = z.output<typeof replacePlaylistItemsSchema>;

export async function listPlaylists(): Promise<PlaylistSummary[]> {
  const { data, error } = await supabase
    .from("playlists")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw fromDbError(error);

  const playlists = (data ?? []) as Playlist[];
  if (playlists.length === 0) return [];

  const { data: items, error: itemsError } = await supabase
    .from("playlist_items")
    .select("playlist_id")
    .in(
      "playlist_id",
      playlists.map((p) => p.id),
    );
  if (itemsError) throw fromDbError(itemsError);

  const counts = new Map<string, number>();
  for (const row of items ?? [])
    counts.set(row.playlist_id, (counts.get(row.playlist_id) ?? 0) + 1);

  return playlists.map((p) => ({ ...p, item_count: counts.get(p.id) ?? 0 }));
}

/** Isi playlist berurutan, lengkap dengan konten, siap diputar di device */
export async function getPlaylistEntries(
  playlistId: string,
): Promise<PlaylistEntry[]> {
  const { data: items, error } = await supabase
    .from("playlist_items")
    .select("content_id,duration_seconds,position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });
  if (error) throw fromDbError(error);
  if (!items?.length) return [];

  const ids = [...new Set(items.map((i) => i.content_id as string))];
  const { data: contents, error: contentError } = await supabase
    .from("contents")
    .select(CONTENT_COLUMNS)
    .in("id", ids);
  if (contentError) throw fromDbError(contentError);

  const byId = new Map(
    (contents ?? []).map((c) => [c.id as string, c as Content]),
  );
  return items.flatMap((item) => {
    const content = byId.get(item.content_id as string);
    return content
      ? [{ duration_seconds: item.duration_seconds as number, content }]
      : [];
  });
}

async function getPlaylistRow(id: string): Promise<Playlist> {
  const { data, error } = await supabase
    .from("playlists")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw notFound("Playlist");
  return data as Playlist;
}

export async function getPlaylist(id: string): Promise<PlaylistDetail> {
  const playlist = await getPlaylistRow(id);
  return { ...playlist, items: await getPlaylistEntries(id) };
}

export async function createPlaylist(
  input: CreatePlaylistInput,
): Promise<PlaylistDetail> {
  const { data, error } = await supabase
    .from("playlists")
    .insert({ nama: input.nama })
    .select(COLUMNS)
    .single();
  if (error) throw fromDbError(error);
  return { ...(data as Playlist), items: [] };
}

export async function renamePlaylist(
  id: string,
  input: UpdatePlaylistInput,
): Promise<Playlist> {
  const { data, error } = await supabase
    .from("playlists")
    .update({ nama: input.nama })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw notFound("Playlist");
  return data as Playlist;
}

/**
 * Ganti seluruh isi playlist dengan daftar baru (urutan = urutan array).
 * PostgREST tidak punya transaksi lintas-request, jadi urutannya dibuat aman:
 * sisipkan item baru dulu, baru hapus yang lama. Kalau langkah hapus gagal, item baru dibatalkan.
 */
export async function replacePlaylistItems(
  id: string,
  input: ReplaceItems,
): Promise<PlaylistDetail> {
  await getPlaylistRow(id);

  const contentIds = [...new Set(input.items.map((i) => i.content_id))];
  if (contentIds.length > 0) {
    const { data, error } = await supabase
      .from("contents")
      .select("id")
      .in("id", contentIds);
    if (error) throw fromDbError(error);
    if ((data?.length ?? 0) !== contentIds.length)
      throw badRequest("Some contents do not exist");
  }

  const { data: oldRows, error: oldError } = await supabase
    .from("playlist_items")
    .select("id")
    .eq("playlist_id", id);
  if (oldError) throw fromDbError(oldError);
  const oldIds = (oldRows ?? []).map((r) => r.id as string);

  let newIds: string[] = [];
  if (input.items.length > 0) {
    const rows = input.items.map((item, position) => ({
      playlist_id: id,
      content_id: item.content_id,
      position,
      duration_seconds: item.duration_seconds,
    }));
    const { data, error } = await supabase
      .from("playlist_items")
      .insert(rows)
      .select("id");
    if (error) throw fromDbError(error);
    newIds = (data ?? []).map((r) => r.id as string);
  }

  if (oldIds.length > 0) {
    const { error } = await supabase
      .from("playlist_items")
      .delete()
      .in("id", oldIds);
    if (error) {
      if (newIds.length > 0)
        await supabase.from("playlist_items").delete().in("id", newIds);
      throw fromDbError(error);
    }
  }

  events.emit("playlist:changed", id);
  return getPlaylist(id);
}

export async function removePlaylist(id: string): Promise<void> {
  const affectedDevices = await getDeviceIdsByPlaylist(id);

  const { data, error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw fromDbError(error);
  if (!data?.length) throw notFound("Playlist");

  // Database otomatis mengosongkan devices.playlist_id; dashboard dan layar perlu tahu
  for (const deviceId of affectedDevices) {
    events.emit("device:playlist_changed", deviceId);
    const device = await getDevicePublic(deviceId);
    if (device) events.emit("device:changed", device);
  }
}

/** Playlist mana saja yang memuat konten ini (untuk memberi tahu layar saat konten berubah) */
export async function playlistIdsContaining(
  contentId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("playlist_items")
    .select("playlist_id")
    .eq("content_id", contentId);
  if (error) throw fromDbError(error);
  return [...new Set((data ?? []).map((r) => r.playlist_id as string))];
}
