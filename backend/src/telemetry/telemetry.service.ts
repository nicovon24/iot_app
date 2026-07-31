import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from '../thingsboard/redis.service';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { EntityType, TbTimeseriesLatest, TelemetryLatest, TelemetryValue } from '../types';

const LATEST_CACHE_TTL_SECONDS = 3;

function serialize(latest: TbTimeseriesLatest): TelemetryLatest {
  const result: TelemetryLatest = {};
  for (const [key, entries] of Object.entries(latest)) {
    const [first] = entries;
    if (first) {
      result[key] = { value: String(first.value), ts: first.ts };
    }
  }
  return result;
}

@Injectable()
export class TelemetryService {
  constructor(
    private readonly tb: ThingsboardClientService,
    private readonly redis: RedisService,
  ) {}

  async getKeys(entityId: string, entityType: EntityType): Promise<string[]> {
    return this.tb.request<string[]>('GET', `/api/plugins/telemetry/${entityType}/${entityId}/keys/timeseries`);
  }

  async getLatest(entityId: string, entityType: EntityType, keys?: string[]): Promise<TelemetryLatest> {
    const sortedKeys = keys ? [...keys].sort().join(',') : 'all';
    const cacheKey = `latest:${entityType}:${entityId}:${sortedKeys}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as TelemetryLatest;
    }

    const resolvedKeys = keys ?? (await this.getKeys(entityId, entityType));
    if (resolvedKeys.length === 0) {
      return {};
    }

    const raw = await this.tb.request<TbTimeseriesLatest>(
      'GET',
      `/api/plugins/telemetry/${entityType}/${entityId}/values/timeseries?keys=${resolvedKeys.join(',')}`,
    );
    const serialized = serialize(raw);

    await this.redis.set(cacheKey, JSON.stringify(serialized), LATEST_CACHE_TTL_SECONDS);
    return serialized;
  }

  async getTimeseries(
    entityId: string,
    entityType: EntityType,
    keys: string[],
    startTs: number,
    endTs: number,
    options?: { agg?: string; intervalMs?: number; limit?: number },
  ): Promise<Record<string, TelemetryValue[]>> {
    const { agg, intervalMs, limit } = options ?? {};

    if (agg && !intervalMs) {
      throw new BadRequestException('"interval" (ms) is required when "agg" is set — aggregation needs a bucket size');
    }

    const params = new URLSearchParams({
      keys: keys.join(','),
      startTs: String(startTs),
      endTs: String(endTs),
    });

    if (agg && intervalMs) {
      // Real bucketed aggregation: one value per `intervalMs` window, not one value for the whole range.
      params.set('agg', agg);
      params.set('interval', String(intervalMs));
    }

    // No backend-invented default — omit entirely unless the caller explicitly asked for a limit,
    // so "no value" means "see everything ThingsBoard itself would return."
    if (limit !== undefined) {
      params.set('limit', String(limit));
    }

    const raw = await this.tb.request<TbTimeseriesLatest>(
      'GET',
      `/api/plugins/telemetry/${entityType}/${entityId}/values/timeseries?${params.toString()}`,
    );

    const result: Record<string, TelemetryValue[]> = {};
    for (const [key, entries] of Object.entries(raw)) {
      result[key] = entries.map((e) => ({ value: String(e.value), ts: e.ts }));
    }
    return result;
  }
}
