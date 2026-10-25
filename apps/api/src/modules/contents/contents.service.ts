import { randomUUID } from "node:crypto";
import {
  type Content,
  type CreateContentInput,
  type ListContentsQuery,
  type Paginated,
  type UpdateContentInput,
  UPLOAD_MIME_TYPES,
  payloadSchemaFor,
} from "@signage/shared";
import { env } from "../../config/env";
import { AppError, badRequest, fromDbError, notFound } from "../../lib/errors";
import { events } from "../../lib/events";
import { pageRange, sanitizeSearch } from "../../lib/search";
import { supabase } from "../../lib/supabase";
import { playlistIdsContaining } from "../playlists/playlists.service";

const COLUMNS = "id,judul,tipe,payload,storage_path,created_at,updated_at";
const bucket = () => supabase.storage.from(env.SUPABASE_STORAGE_BUCKET);

export async function listContents(
  q: ListContentsQuery,
): Promise<Paginated<Content>> {
  let query = supabase.from("contents").select(COLUMNS, { count: "exact" });

  if (q.tipe) query = query.eq("tipe", q.tipe);
  const term = sanitizeSearch(q.q);
  if (term) query = query.ilike("judul", `%${term}%`);

  const { from, to } = pageRange(q.page, q.pageSize);
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw fromDbError(error);

  return {
    data: (data ?? []) as Content[],
    total: count ?? 0,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export async function getContent(id: string): Promise<Content> {
  const { data, error } = await supabase
    .from("contents")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw fromDbError(error);
  if (!data) throw notFound("Content");
  return data as Content;
}

/** Konten tanpa file: text, url, atau image/video dari URL eksternal */
export async function createContent(
  input: CreateContentInput,
): Promise<Content> {
  const { data, error } = await supabase
    .from("contents")
    .insert({ judul: input.judul, tipe: input.tipe, payload: input.payload })
    .select(COLUMNS)
    .single();
  if (error) throw fromDbError(error);
  return data as Content;
}

interface UploadInput {
  judul: string;
  buffer: Buffer;
  mimetype: string;
}

/** Upload file ke Supabase Storage lalu simpan sebagai konten image/video */
export async function createContentFromUpload({
  judul,
  buffer,
  mimetype,
}: UploadInput): Promise<Content> {
  const kind = UPLOAD_MIME_TYPES[mimetype];
  if (!kind) {
    throw new AppError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      `File type "${mimetype}" is not supported`,
    );
  }
  if (buffer.length === 0) throw badRequest("File is empty");

  const storagePath = `${kind.tipe}/${randomUUID()}.${kind.ext}`;

  const { error: uploadError } = await bucket().upload(storagePath, buffer, {
    contentType: mimetype,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError)
    throw new AppError(
      502,
      "STORAGE_ERROR",
      "Failed to upload file",
      uploadError,
    );

  const { data: pub } = bucket().getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from("contents")
    .insert({
      judul,
      tipe: kind.tipe,
      payload: pub.publicUrl,
      storage_path: storagePath,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    // rollback: jangan tinggalkan file yatim di storage
    await bucket().remove([storagePath]);
    throw fromDbError(error);
  }
  return data as Content;
}

export async function updateContent(
  id: string,
  input: UpdateContentInput,
): Promise<Content> {
  const existing = await getContent(id);
  const patch: Record<string, unknown> = {};

  if (input.judul !== undefined) patch.judul = input.judul;

  if (input.payload !== undefined) {
    if (existing.storage_path) {
      throw badRequest(
        "Payload of an uploaded file cannot be edited. Delete it and upload a new file.",
      );
    }
    // Validasi ulang sesuai tipe (text = teks, lainnya = URL); ZodError -> 400
    patch.payload = payloadSchemaFor(existing.tipe).parse(input.payload);
  }

  const { data, error } = await supabase
    .from("contents")
    .update(patch)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw fromDbError(error);
  await notifyPlaylists(await playlistIdsContaining(id));
  return data as Content;
}

/** Layar yang memutar playlist-playlist ini perlu menerima isi terbaru */ // BARU
async function notifyPlaylists(playlistIds: string[]) {
  for (const playlistId of playlistIds)
    events.emit("playlist:changed", playlistId);
}

export async function removeContent(id: string): Promise<void> {
  const existing = await getContent(id);
  // Harus dicatat sebelum dihapus: database ikut menghapus item playlist yang memuat konten ini
  const affectedPlaylists = await playlistIdsContaining(id); // BARU

  const { error } = await supabase.from("contents").delete().eq("id", id);
  if (error) throw fromDbError(error);
  await notifyPlaylists(affectedPlaylists); // BARU

  // Best-effort: kegagalan hapus file tidak menggagalkan request
  if (existing.storage_path) {
    const { error: rmError } = await bucket().remove([existing.storage_path]);
    if (rmError)
      console.warn(
        `Failed to remove storage object ${existing.storage_path}: ${rmError.message}`,
      );
  }
}
