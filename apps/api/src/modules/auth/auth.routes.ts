import { loginSchema } from "@signage/shared";
import type { FastifyInstance } from "fastify";
import { login } from "./auth.service";

/** Publik: siapa pun boleh mencoba login, tapi dibatasi laju untuk menahan tebak-tebakan password */
export async function authPublicRoutes(app: FastifyInstance) {
  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req) => login(loginSchema.parse(req.body)),
  );
}

/** Terlindungi (dipasang di dalam plugin yang memakai requireAuth) */
export async function authProtectedRoutes(app: FastifyInstance) {
  app.get("/auth/me", async (req) => ({
    username: req.admin?.username,
    expiresAt: (req.admin?.exp ?? 0) * 1000,
  }));
}
