import { type RawData, WebSocket } from "ws";
import type { FastifyBaseLogger } from "fastify";
import { z } from "zod";
import { WS_CLOSE, dashboardMessageSchema, uuidSchema } from "@signage/shared";
import { AppError } from "../lib/errors";
import { getContent } from "../modules/contents/contents.service";
import { getPlaylistEntries } from "../modules/playlists/playlists.service";
import { getAllDevices, touchDevice } from "../modules/devices/devices.service";
import { verifyDashboardToken, verifyDeviceToken } from "./auth";
import { Hub, type Tracked, closeGracefully, send } from "./hub";
import { markOffline, markOnline } from "./presence";

export interface Ctx {
  hub: Hub;
  log: FastifyBaseLogger;
  isShuttingDown: () => boolean;
}

/** Parameter di URL: /ws?role=device&deviceId=...&token=...  atau  /ws?role=dashboard&token=... */
const connectionQuerySchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("device"),
    deviceId: uuidSchema,
    token: z.string().min(1),
  }),
  z.object({ role: z.literal("dashboard"), token: z.string().optional() }),
]);

/** Dipanggil untuk setiap koneksi WebSocket baru (handshake sudah selesai) */
export async function handleConnection(ws: WebSocket, url: URL, ctx: Ctx) {
  // Tanpa listener 'error', error socket akan menjatuhkan seluruh proses
  ws.on("error", (err) => ctx.log.warn({ err }, "websocket error"));

  const parsed = connectionQuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsed.success) {
    closeGracefully(ws, WS_CLOSE.BAD_REQUEST, "Invalid connection parameters");
    return;
  }

  try {
    if (parsed.data.role === "device") {
      await handleDevice(ws, parsed.data.deviceId, parsed.data.token, ctx);
    } else {
      await handleDashboard(ws, parsed.data.token, ctx);
    }
  } catch (err) {
    ctx.log.error({ err }, "failed to set up websocket connection");
    closeGracefully(ws, 1011, "Internal error");
  }
}

// ---------------------------------------------------------------------
// Device
// ---------------------------------------------------------------------
async function handleDevice(
  ws: WebSocket,
  deviceId: string,
  token: string,
  ctx: Ctx,
) {
  const { hub, log } = ctx;

  if (!(await verifyDeviceToken(deviceId, token))) {
    closeGracefully(ws, WS_CLOSE.UNAUTHORIZED, "Unauthorized");
    return;
  }
  // Koneksi bisa saja sudah putus selama menunggu database
  if (ws.readyState !== WebSocket.OPEN) return;

  const tracked: Tracked = {
    ws,
    isAlive: true,
    deviceId,
    lastDbTouch: Date.now(),
  };

  // Maksimal satu koneksi per device: koneksi lama digantikan
  const previous = hub.setDevice(deviceId, tracked);
  if (previous)
    closeGracefully(
      previous.ws,
      WS_CLOSE.REPLACED,
      "Replaced by a newer connection",
    );

  ws.on("pong", () => {
    tracked.isAlive = true;
    // Perbarui last_seen paling sering sekali per menit agar DB tidak dibanjiri tulisan
    if (Date.now() - tracked.lastDbTouch > 60_000) {
      tracked.lastDbTouch = Date.now();
      touchDevice(deviceId).catch((err) =>
        log.warn({ err, deviceId }, "failed to touch last_seen"),
      );
    }
  });

  // Protokol saat ini: device tidak mengirim pesan apa pun. Pesan masuk diabaikan.
  ws.on("message", () => undefined);

  ws.on("close", () => {
    if (ctx.isShuttingDown()) return; // shutdown mereset semua status sekaligus
    // false = koneksi ini sudah digantikan koneksi baru, jadi device tidak offline
    if (!hub.removeDevice(deviceId, tracked)) return;
    markOffline(hub, deviceId).catch((err) =>
      log.error({ err, deviceId }, "failed to mark device offline"),
    );
  });

  const device = await markOnline(hub, deviceId);
  if (!device) {
    closeGracefully(ws, WS_CLOSE.UNAUTHORIZED, "Device not found");
    return;
  }
  log.info({ deviceId }, "device connected");

  // Kegagalan memuat playlist tidak boleh mencegah layar tersambung: kirim kosong, layar tetap online
  const playlist = device.playlist_id
    ? await getPlaylistEntries(device.playlist_id).catch((err) => {
        log.error({ err, deviceId }, "failed to load playlist for welcome");
        return [];
      })
    : [];
  send(ws, { type: "welcome", device, playlist });
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
async function handleDashboard(
  ws: WebSocket,
  token: string | undefined,
  ctx: Ctx,
) {
  const { hub, log } = ctx;

  const session = await verifyDashboardToken(token);
  if (!session) {
    closeGracefully(ws, WS_CLOSE.UNAUTHORIZED, "Unauthorized");
    return;
  }
  if (ws.readyState !== WebSocket.OPEN) return;

  const tracked: Tracked = {
    ws,
    isAlive: true,
    lastDbTouch: 0,
    expiresAt: session.expiresAt,
  };
  hub.addDashboard(tracked);

  ws.on("pong", () => {
    tracked.isAlive = true;
  });
  ws.on("close", () => hub.removeDashboard(tracked));
  ws.on("message", (raw, isBinary) => {
    onDashboardMessage(tracked, raw, isBinary, ctx).catch((err) =>
      log.error({ err }, "failed to handle dashboard message"),
    );
  });

  // Dashboard baru langsung mendapat kondisi terkini semua device
  send(ws, { type: "snapshot", devices: await getAllDevices() });
  log.info({ ...hub.stats() }, "dashboard connected");
}

async function onDashboardMessage(
  from: Tracked,
  raw: RawData,
  isBinary: boolean,
  ctx: Ctx,
) {
  const fail = (message: string) => send(from.ws, { type: "error", message });

  if (isBinary) return void fail("Binary messages are not supported");

  let json: unknown;
  try {
    json = JSON.parse(raw.toString());
  } catch {
    return void fail("Message must be valid JSON");
  }

  const parsed = dashboardMessageSchema.safeParse(json);
  if (!parsed.success) return void fail("Invalid message");
  const msg = parsed.data;

  if (msg.type === "push_content") {
    try {
      const content = await getContent(msg.contentId);
      const delivered = ctx.hub.sendToDevice(msg.deviceId, {
        type: "push_content",
        content,
        duration_seconds: msg.duration_seconds,
      });
      if (!delivered) fail("Device is offline");
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 404)
        return void fail(err.message);
      throw err;
    }
  }
}
