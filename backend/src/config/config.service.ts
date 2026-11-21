import { Injectable } from '@nestjs/common';
import { AppConfig, configSchema } from './config.schema';

@Injectable()
export class ConfigService {
  private readonly config: AppConfig;

  constructor() {
    const parsed = configSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
    }
    this.config = parsed.data;
  }

  get thingsboardUrl(): string {
    return this.config.THINGSBOARD_URL;
  }

  get thingsboardAllowedUrls(): string[] {
    return [this.config.THINGSBOARD_URL, ...(this.config.THINGSBOARD_ALLOWED_URLS?.split(',') ?? [])]
      .map((url) => url.trim())
      .filter(Boolean)
      .map((url) => new URL(url).origin);
  }

  get redisUrl(): string {
    return this.config.REDIS_URL;
  }

  get databaseUrl(): string {
    return this.config.DATABASE_URL;
  }

  get aiCredentialEncryptionKey(): string | undefined {
    return this.config.AI_CREDENTIAL_ENCRYPTION_KEY;
  }

  get frontendUrl(): string {
    return this.config.FRONTEND_URL;
  }

  get port(): number {
    return this.config.PORT;
  }
}
