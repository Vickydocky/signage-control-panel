import path from "node:path";
import { config } from "dotenv";
import { z } from "zod";

// Load .env dari root monorepo (atau dari apps/api sebagai fallback)
config({
  path: [
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), ".env"),
  ],
});

const DEV_JWT_SECRET = "dev-only-secret-change-me-please";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173,http://localhost:5174"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default("contents"),
  JWT_SECRET: z.string().min(16).default(DEV_JWT_SECRET),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, "Use a number followed by s, m, h or d (e.g. 8h)")
    .default("8h"),
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  WS_PING_INTERVAL_MS: z.coerce.number().int().min(500).default(15000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("\nCopy .env.example to .env and fill in the values.");
  process.exit(1);
}

if (
  parsed.data.NODE_ENV === "production" &&
  parsed.data.JWT_SECRET === DEV_JWT_SECRET
) {
  console.error("JWT_SECRET must be set to a unique secret in production.");
  process.exit(1);
}

export const env = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  isDev: parsed.data.NODE_ENV === "development",
};
