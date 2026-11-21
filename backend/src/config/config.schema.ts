import { z } from 'zod';

export const configSchema = z.object({
  THINGSBOARD_URL: z.string().url(),
  THINGSBOARD_ALLOWED_URLS: z.string().optional(),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  DATABASE_URL: z.string().min(1),
  AI_CREDENTIAL_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/)
    .optional(),
  AI_ALLOWED_BASE_URLS: z.string().optional(),
  // Validated here rather than read straight from process.env in main.ts: a typo
  // used to fall back silently to localhost:3000, so CORS would reject the real
  // frontend in production with nothing pointing at the cause.
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().int().positive().default(3001),
});

export type AppConfig = z.infer<typeof configSchema>;
