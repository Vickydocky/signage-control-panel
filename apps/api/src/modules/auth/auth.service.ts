import { SignJWT, decodeJwt, jwtVerify } from "jose";
import type { LoginInput, LoginResponse } from "@signage/shared";
import { env } from "../../config/env";
import { fromDbError, unauthorized } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/passwords";
import { supabase } from "../../lib/supabase";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface AdminSession {
  /** ID admin */
  sub: string;
  username: string;
  /** Detik sejak epoch */
  exp: number;
}

/**
 * Hash palsu untuk membandingkan password saat username tidak ditemukan. Tanpa ini, login dengan
 * username yang tidak ada selesai jauh lebih cepat, dan selisih waktunya membocorkan siapa saja yang terdaftar.
 */
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password"));

export async function login({
  username,
  password,
}: LoginInput): Promise<LoginResponse> {
  const { data, error } = await supabase
    .from("admins")
    .select("id,username,password_hash")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (error) throw fromDbError(error);

  const passwordOk = await verifyPassword(
    password,
    data?.password_hash ?? (await getDummyHash()),
  );
  // Pesan yang sama untuk "username tidak ada" dan "password salah"
  if (!data || !passwordOk) throw unauthorized("Invalid username or password");

  const token = await new SignJWT({ username: data.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(data.id)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);

  const { exp } = decodeJwt(token);
  return {
    token,
    expiresAt: (exp ?? 0) * 1000,
    admin: { id: data.id, username: data.username },
  };
}

/** null jika token palsu, rusak, kedaluwarsa, atau memakai algoritma lain */
export async function verifyToken(token: string): Promise<AdminSession | null> {
  try {
    // algorithms: hanya HS256. Menolak token "alg: none" dan serangan pertukaran algoritma.
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.exp !== "number")
      return null;
    return {
      sub: payload.sub,
      username: String(payload.username ?? ""),
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
