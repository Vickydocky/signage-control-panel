import type { FastifyInstance } from "fastify";
import { WebSocketServer } from "ws";
import { WS_CLOSE, WS_PATH } from "@signage/shared";
import { env } from "../config/env";
import { events } from "../lib/events";
import { resetAllDevicesOffline } from "../modules/devices/devices.service";
import { type Ctx, handleConnection } from "./handlers";
import { Hub, closeGracefully } from "./hub";
import { pushPlaylistToDevice, pushPlaylistToDevices } from "./playlist";

/** Pasang WebSocket server di atas HTTP server milik Fastify (port yang sama, path /ws) */
export function registerRealtime(app: FastifyInstance) {
  const hub = new Hub();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  let shuttingDown = false;
  const ctx: Ctx = { hub, log: app.log, isShuttingDown: () => shuttingDown };

  // 1) Request HTTP dengan header "Upgrade: websocket" masuk lewat event 'upgrade'
  app.server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "", "http://localhost");
    if (url.pathname !== WS_PATH) {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      void handleConnection(ws, url, ctx);
    });
  });

  // 2) Heartbeat: tiap interval kirim ping. Yang belum membalas ping sebelumnya dianggap mati.
  //    terminate() memicu event 'close', dan handler close yang menandai device offline.
  const heartbeat = setInterval(() => {
    for (const t of hub.all()) {
      if (t.expiresAt && Date.now() >= t.expiresAt) {
        closeGracefully(t.ws, WS_CLOSE.UNAUTHORIZED, "Session expired");
        continue;
      }
      if (!t.isAlive) {
        t.ws.terminate();
        continue;
      }
      t.isAlive = false;
      t.ws.ping();
    }
  }, env.WS_PING_INTERVAL_MS);
  heartbeat.unref();

  // 3) Perubahan dari layer REST diteruskan ke dashboard / device
  events.on("device:changed", (device) =>
    hub.broadcast({ type: "device_changed", device }),
  );
  events.on("device:removed", (deviceId) => {
    hub.broadcast({ type: "device_removed", deviceId });
    hub.closeDevice(deviceId, WS_CLOSE.DEVICE_REMOVED, "Device removed");
  });
  events.on("device:token_rotated", (deviceId) => {
    hub.closeDevice(deviceId, WS_CLOSE.TOKEN_ROTATED, "Token rotated");
  });
  events.on("device:playlist_changed", (deviceId) => {
    pushPlaylistToDevice(hub, deviceId).catch((err) =>
      app.log.error({ err, deviceId }, "failed to push playlist"),
    );
  });
  events.on("playlist:changed", (playlistId) => {
    pushPlaylistToDevices(hub, playlistId).catch((err) =>
      app.log.error({ err, playlistId }, "failed to push playlist"),
    );
  });

  // 4) Start: koneksi hanya ada di memori, jadi sisa status "online" dari proses lama pasti basi
  app.addHook("onReady", async () => {
    const count = await resetAllDevicesOffline();
    app.log.info(
      `realtime ready (reset ${count} stale online device(s) to offline)`,
    );
  });

  // 5) Stop: tutup semua koneksi dengan rapi, lalu reset status sekaligus.
  //    Harus di `preClose`, bukan `onClose`: server.close() menunggu semua koneksi selesai,
  //    jadi WebSocket yang masih terbuka akan membuat shutdown macet kalau baru ditutup di onClose.
  app.addHook("preClose", async () => {
    shuttingDown = true;
    clearInterval(heartbeat);
    for (const t of hub.all())
      closeGracefully(t.ws, 1001, "Server shutting down");
    wss.close();
    await resetAllDevicesOffline().catch((err) =>
      app.log.error({ err }, "failed to reset devices on shutdown"),
    );
  });

  return hub;
}
