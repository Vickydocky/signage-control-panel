import type { FastifyRequest } from "fastify";
import { unauthorized } from "../../lib/errors";
import { type AdminSession, verifyToken } from "./auth.service";

declare module "fastify" {
  interface FastifyRequest {
    admin?: AdminSession;
  }
}

/** Hook onRequest: wajib header `Authorization: Bearer <jwt>` yang valid */
export async function requireAuth(req: FastifyRequest): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const session = token ? await verifyToken(token) : null;
  if (!session) throw unauthorized("Authentication required");
  req.admin = session;
}
