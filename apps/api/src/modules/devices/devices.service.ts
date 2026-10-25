import { randomBytes } from "node:crypto";
import type {
  CreateDeviceInput,
  Device,
  DeviceStatus,
  DeviceWithToken,
  ListDevicesQuery,
  Paginated,
  UpdateDeviceInput,
} from "@signage/shared";
import { fromDbError, notFound } from "../../lib/errors";
import { events } from "../../lib/events";
import { pageRange, sanitizeSearch } from "../../lib/search";
import { supabase } from "../../lib/supabase";

// device_token sengaja TIDAK ada di kolom publik
const COLUMNS =
  "id,nama,lokasi,status,last_seen,playlist_id,created_at,updated_at";
const COLUMNS_WITH_TOKEN = `${COLUMNS},device_token`;

export async function listDevices(
  q: ListDevicesQuery,
): Promise<Paginated<Device>> {
  let query = supabase.from("devices").select(COLUMNS, { count: "exact" });

  if (q.status) query = query.eq("status", q.status);
  const term = sanitizeSearch(q.q);
  if (term) query = query.or(`nama.ilike.%${term}%,lokasi.ilike.%${term}%`);

  const { from, to } = pageRange(q.page, q.pageSize);
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw fromDbError(error);

  return {
    data: (data ?? []) as Device[],
    total: count ?? 0,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export async function getDevice(id: string): Promise<DeviceWithToken> {
  const { data, error } = await supabase
    .from("devices")
    .select(COLUMNS_WITH_TOKEN)
    .eq("id", id)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw notFound("Device");
  return data as DeviceWithToken;
}

export async function createDevice(
  input: CreateDeviceInput,
): Promise<DeviceWithToken> {
  const { data, error } = await supabase
    .from("devices")
    .insert({ nama: input.nama, lokasi: input.lokasi?.trim() || null })
    .select(COLUMNS_WITH_TOKEN)
    .single();
  if (error) throw fromDbError(error);

  const device = data as DeviceWithToken;
  events.emit("device:changed", stripToken(device));
  return device;
}

/** Catatan: `status` & `last_seen` sengaja tidak bisa diubah via REST, hanya oleh WebSocket server. */
export async function updateDevice(
  id: string,
  input: UpdateDeviceInput,
): Promise<DeviceWithToken> {
  const patch: Record<string, unknown> = {};
  if (input.nama !== undefined) patch.nama = input.nama;
  if (input.lokasi !== undefined) patch.lokasi = input.lokasi?.trim() || null;
  if (input.playlist_id !== undefined) patch.playlist_id = input.playlist_id;

  const { data, error } = await supabase
    .from("devices")
    .update(patch)
    .eq("id", id)
    .select(COLUMNS_WITH_TOKEN)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw notFound("Device");

  const device = data as DeviceWithToken;
  events.emit("device:changed", stripToken(device));
  if (input.playlist_id !== undefined)
    events.emit("device:playlist_changed", id);
  return device;
}

export async function regenerateToken(id: string): Promise<DeviceWithToken> {
  const { data, error } = await supabase
    .from("devices")
    .update({ device_token: randomBytes(32).toString("hex") })
    .eq("id", id)
    .select(COLUMNS_WITH_TOKEN)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw notFound("Device");

  events.emit("device:token_rotated", id); // WS server akan memutus koneksi device dengan token lama
  return data as DeviceWithToken;
}

export async function removeDevice(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("devices")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw fromDbError(error);
  if (!data?.length) throw notFound("Device");

  events.emit("device:removed", id);
}

function stripToken({
  device_token: _token,
  ...device
}: DeviceWithToken): Device {
  return device;
}

export async function getAllDevices(): Promise<Device[]> {
  const { data, error } = await supabase
    .from("devices")
    .select(COLUMNS)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) throw fromDbError(error);
  return (data ?? []) as Device[];
}

/** Return null jika device sudah tidak ada (mis. dihapus saat sedang connect) */
export async function setDeviceStatus(
  id: string,
  status: DeviceStatus,
  lastSeen: string = new Date().toISOString(),
): Promise<Device | null> {
  const { data, error } = await supabase
    .from("devices")
    .update({ status, last_seen: lastSeen })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw fromDbError(error);
  return (data as Device | null) ?? null;
}

export async function touchDevice(id: string): Promise<void> {
  const { error } = await supabase
    .from("devices")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", id);
  if (error) throw fromDbError(error);
}

/** Dipanggil saat server start/stop: koneksi in-memory hilang, jadi semua device dianggap offline */
export async function resetAllDevicesOffline(): Promise<number> {
  const { data, error } = await supabase
    .from("devices")
    .update({ status: "offline" })
    .eq("status", "online")
    .select("id");
  if (error) throw fromDbError(error);
  return data?.length ?? 0;
}

/** Satu device tanpa token; null jika tidak ada */
export async function getDevicePublic(id: string): Promise<Device | null> {
  const { data, error } = await supabase
    .from("devices")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw fromDbError(error);
  return (data as Device | null) ?? null;
}

/** ID semua device yang memakai playlist tertentu */
export async function getDeviceIdsByPlaylist(
  playlistId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("devices")
    .select("id")
    .eq("playlist_id", playlistId);
  if (error) throw fromDbError(error);
  return (data ?? []).map((row) => row.id as string);
}
