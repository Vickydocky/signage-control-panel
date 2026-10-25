import { WS_PATH } from "@signage/shared";

export interface Credentials {
  serverUrl: string;
  deviceId: string;
  token: string;
}

export const DEFAULT_SERVER_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const KEY = "signage.device.credentials";

/** Baca kredensial tersimpan. localStorage bisa saja diblokir/rusak, jadi semua dibungkus try/catch. */
export function loadCredentials(): Credentials | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const { serverUrl, deviceId, token } = parsed as Record<string, unknown>;
      if (
        typeof serverUrl === "string" &&
        typeof deviceId === "string" &&
        typeof token === "string"
      ) {
        return { serverUrl, deviceId, token };
      }
    }
  } catch {
    /* data rusak: anggap belum ada */
  }
  return null;
}

export function saveCredentials(credentials: Credentials): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(credentials));
  } catch {
    /* penyimpanan penuh/diblokir: layar tetap jalan, hanya tidak diingat saat dibuka ulang */
  }
}

export function clearCredentials(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}

/** http://host:4000 + kredensial -> ws://host:4000/ws?role=device&deviceId=...&token=... */
export function toWsUrl({ serverUrl, deviceId, token }: Credentials): string {
  const base = serverUrl.trim().replace(/\/+$/, "").replace(/^http/, "ws");
  const query = new URLSearchParams({ role: "device", deviceId, token });
  return `${base}${WS_PATH}?${query}`;
}
