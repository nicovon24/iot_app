import { z } from 'zod';

export const configSchema = z.object({
  THINGSBOARD_URL: z.string().url(),
  THINGSBOARD_USERNAME: z.string().min(1),
  THINGSBOARD_PASSWORD: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  DATABASE_URL: z.string().min(1),
  // Validated here rather than read straight from process.env in main.ts: a typo
  // used to fall back silently to localhost:3000, so CORS would reject the real
  // frontend in production with nothing pointing at the cause.
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().int().positive().default(3001),
});

export type AppConfig = z.infer<typeof configSchema>;
