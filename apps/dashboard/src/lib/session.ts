export interface Session {
  token: string;
  /** Milidetik sejak epoch */
  expiresAt: number;
  username: string;
}

const KEY = "signage.dashboard.session";

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* penyimpanan diblokir: sesi tetap jalan, hanya hilang saat tab ditutup */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}

/** Sesi tersimpan yang masih berlaku, atau null. Data rusak atau kedaluwarsa ikut dibersihkan. */
export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const { token, expiresAt, username } = parsed as Record<string, unknown>;
      if (
        typeof token === "string" &&
        typeof expiresAt === "number" &&
        typeof username === "string" &&
        expiresAt > Date.now()
      ) {
        return { token, expiresAt, username };
      }
    }
  } catch {
    /* data rusak */
  }
  clearSession();
  return null;
}
