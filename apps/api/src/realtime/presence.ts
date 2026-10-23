import type { Device } from "@signage/shared";
import { setDeviceStatus } from "../modules/devices/devices.service";
import type { Hub } from "./hub";

/**
 * Antrian per device: update status ke DB dijalankan satu per satu, sesuai urutan kejadian.
 * Tanpa ini, device yang putus lalu cepat reconnect bisa menghasilkan dua request DB yang
 * selesai terbalik urutannya, sehingga DB bilang "offline" padahal device sedang terhubung.
 */
const queues = new Map<string, Promise<unknown>>();

function serial<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  queues.set(key, next);
  next
    .finally(() => {
      if (queues.get(key) === next) queues.delete(key);
    })
    .catch(() => undefined);
  return next;
}

/** Tandai online di DB lalu kabari semua dashboard. Return null kalau device sudah tidak ada. */
export function markOnline(hub: Hub, deviceId: string): Promise<Device | null> {
  return serial(deviceId, async () => {
    const device = await setDeviceStatus(deviceId, "online");
    if (device) {
      hub.broadcast({
        type: "device_status",
        deviceId,
        status: "online",
        last_seen: device.last_seen ?? new Date().toISOString(),
      });
    }
    return device;
  });
}

/** Tandai offline di DB lalu kabari dashboard, kecuali device ternyata sudah terhubung lagi. */
export function markOffline(hub: Hub, deviceId: string): Promise<void> {
  return serial(deviceId, async () => {
    if (hub.isOnline(deviceId)) return; // sudah reconnect saat antrian berjalan
    const device = await setDeviceStatus(deviceId, "offline");
    if (device) {
      hub.broadcast({
        type: "device_status",
        deviceId,
        status: "offline",
        last_seen: device.last_seen ?? new Date().toISOString(),
      });
    }
  });
}
