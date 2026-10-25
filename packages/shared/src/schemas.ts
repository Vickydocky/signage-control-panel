import { z } from "zod";
import type { ContentType } from "./index";

export const uuidSchema = z.string().uuid();
export const idParamsSchema = z.object({ id: uuidSchema });

const title = (max: number) => z.string().trim().min(1, "Required").max(max);

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url("Must be a valid URL")
  .refine(
    (u) => /^https?:\/\//i.test(u),
    "URL must start with http:// or https://",
  );

const textPayload = z.string().trim().min(1, "Required").max(2000);

/** Skema payload sesuai tipe konten (text = isi teks, lainnya = URL) */
export const payloadSchemaFor = (tipe: ContentType) =>
  tipe === "text" ? textPayload : httpUrl;

// ---------- Devices ----------
export const createDeviceSchema = z.object({
  nama: title(120),
  lokasi: z.string().trim().max(200).nullable().optional(),
});

export const updateDeviceSchema = createDeviceSchema
  .extend({ playlist_id: uuidSchema.nullable() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

// ---------- Contents ----------
export const createContentSchema = z.discriminatedUnion("tipe", [
  z.object({
    judul: title(200),
    tipe: z.literal("text"),
    payload: textPayload,
  }),
  z.object({ judul: title(200), tipe: z.literal("url"), payload: httpUrl }),
  z.object({ judul: title(200), tipe: z.literal("image"), payload: httpUrl }),
  z.object({ judul: title(200), tipe: z.literal("video"), payload: httpUrl }),
]);

export const updateContentSchema = z
  .object({
    judul: title(200).optional(),
    payload: z.string().trim().min(1).max(2048).optional(), // divalidasi ulang sesuai tipe di server
  })
  .refine((v) => Object.keys(v).length > 0, "At least one field is required");

export const createPlaylistSchema = z.object({ nama: title(120) });
export const updatePlaylistSchema = createPlaylistSchema;

export const replacePlaylistItemsSchema = z.object({
  items: z
    .array(
      z.object({
        content_id: uuidSchema,
        duration_seconds: z.number().int().min(1).max(3600).default(10),
      }),
    )
    .max(100),
});

// ---------- List queries ----------
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
});

export const listDevicesQuerySchema = listQuery.extend({
  status: z.enum(["online", "offline"]).optional(),
});

export const listContentsQuerySchema = listQuery.extend({
  tipe: z.enum(["image", "video", "text", "url"]).optional(),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
export type ListDevicesQuery = z.infer<typeof listDevicesQuerySchema>;
export type ListContentsQuery = z.infer<typeof listContentsQuerySchema>;
export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;
/** z.input: `duration_seconds` boleh dikosongkan oleh pengirim (default 10 diisi server) */
export type ReplacePlaylistItemsInput = z.input<
  typeof replacePlaylistItemsSchema
>;

// ---------- WebSocket: pesan dashboard -> server ----------
export const dashboardMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("push_content"),
    deviceId: uuidSchema,
    contentId: uuidSchema,
    duration_seconds: z.number().int().min(1).max(3600).optional(),
  }),
]);
