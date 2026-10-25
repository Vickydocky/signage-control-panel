import { createHash, timingSafeEqual } from "node:crypto";
import { AppError } from "../lib/errors";
import { verifyToken } from '../modules/auth/auth.service';
import { getDevice } from "../modules/devices/devices.service";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/** Bandingkan string dengan waktu konstan (hash dulu agar panjang buffer selalu sama) */
const safeEqual = (a: string, b: string) =>
  timingSafeEqual(sha256(a), sha256(b));

/** true jika deviceId ada DAN token cocok. "Tidak ada" dan "token salah" sengaja tidak dibedakan. */
export async function verifyDeviceToken(
  deviceId: string,
  token: string,
): Promise<boolean> {
  try {
    const device = await getDevice(deviceId);
    return safeEqual(device.device_token, token);
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 404) return false;
    throw err;
  }
}

/** Sesi dashboard yang sah, atau null. `expiresAt` dalam milidetik. */
export async function verifyDashboardToken(token: string | undefined): Promise<{ expiresAt: number } | null> {
  if (!token) return null;
  const session = await verifyToken(token);
  return session ? { expiresAt: session.exp * 1000 } : null;
}
