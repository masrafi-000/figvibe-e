import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(5000),

  API_PREFIX: z.string().default("api/v1") ,

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().min(1),

  CORS_ORIGIN: z.string().url(),

  SALT_ROUNDS : z.coerce.number().int().positive().default(20),

  // Session
  SESSION_SECRET: z.string().min(1).default("super_secret_key_do_not_share_and_make_more_secure"),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(1).default("access_token_super_secret_key_123456"),
  JWT_REFRESH_SECRET: z.string().min(1).default("refresh_token_super_secret_key_123456"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Frontend URL
  FRONTEND_URL: z.string().default("http://localhost:3000"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables: ");
  console.error(parsed.error.flatten().fieldErrors);

  process.exit(1);
}

export const env = parsed.data;

