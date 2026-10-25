import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { MAX_UPLOAD_BYTES } from "@signage/shared";
import Fastify from "fastify";
import { ZodError } from "zod";
import { env } from "./config/env";
import { AppError } from "./lib/errors";
import { apiRoutes } from "./routes";
import { healthRoutes } from "./routes/health";
import { registerRealtime } from "./realtime";

export async function buildApp() {
  const app = Fastify({
    trustProxy: env.TRUST_PROXY,
    logger: {
      level: env.LOG_LEVEL,
      transport: env.isDev
        ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } }
        : undefined,
    },
  });

  await app.register(cors, {
    origin: env.corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  });
  // global: false => hanya rute yang memasang config.rateLimit yang dibatasi (mis. login)
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_req, context) =>
      new AppError(
        429,
        "RATE_LIMITED",
        `Too many attempts. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
      ),
  });
  await app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 },
  });

  // Format error konsisten: { error: { code, message, details? } }
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details: err.flatten(),
        },
      });
    }
    if (err instanceof AppError) {
      if (err.statusCode >= 500)
        req.log.error({ err, cause: err.cause }, err.message);
      return reply
        .status(err.statusCode)
        .send({ error: { code: err.code, message: err.message } });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) req.log.error(err);
    return reply.status(status).send({
      error: {
        code: status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
        message:
          status >= 500 ? "Internal server error" : (err as Error).message,
      },
    });
  });

  app.setNotFoundHandler((_req, reply) =>
    reply
      .status(404)
      .send({ error: { code: "NOT_FOUND", message: "Route not found" } }),
  );

  await app.register(healthRoutes);
  await app.register(apiRoutes, { prefix: "/api" });
  registerRealtime(app);

  return app;
}
