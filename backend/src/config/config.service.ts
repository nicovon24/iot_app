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

  get thingsboardUsername(): string {
    return this.config.THINGSBOARD_USERNAME;
  }

  get thingsboardPassword(): string {
    return this.config.THINGSBOARD_PASSWORD;
  }

  get redisUrl(): string {
    return this.config.REDIS_URL;
  }

  get databaseUrl(): string {
    return this.config.DATABASE_URL;
  }

  get port(): number {
    return this.config.PORT;
  }
}
