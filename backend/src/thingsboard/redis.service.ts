import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '../config/config.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 5000),
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`, err.stack);
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** Batched read. The reference resolver looks up many ids at once, so issuing
   *  one GET per id turned a single logical lookup into N network round trips. */
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    return this.client.mget(...keys);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** Resets a key's TTL without rewriting its value — used for sliding sessions. */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  private readonly inflight = new Map<string, Promise<unknown>>();

  /**
   * Collapses concurrent misses for the same key into a single upstream call.
   *
   * Dashboard widgets poll telemetry every 5s each against a 3s cache TTL, so
   * without this a board with eight widgets on one device fires eight identical
   * ThingsBoard requests at every expiry, forever. Same for the service-account
   * JWT: several requests arriving on an empty cache each ran their own login.
   *
   * In-process only, which is correct for a single instance. More than one
   * backend instance would need a Redis SET NX lock instead.
   */
  single<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const p = fn().finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  /**
   * SCAN rather than KEYS: KEYS walks the whole keyspace in one blocking call on
   * Redis's single thread, and this runs on every attribute write. SCAN gives no
   * snapshot guarantee, which is fine for invalidation — a key that appears
   * mid-scan simply misses this sweep and expires on its own TTL.
   * UNLINK rather than DEL so the memory is freed on a background thread.
   */
  async delByPattern(pattern: string): Promise<void> {
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) {
        await this.client.unlink(...keys);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
