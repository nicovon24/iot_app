import { Injectable } from '@nestjs/common';
import { RedisService } from '../thingsboard/redis.service';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { EntityType, TbAttribute, TbAttributeScope } from '../types';

const ATTRIBUTES_CACHE_TTL_SECONDS = 5;

@Injectable()
export class AttributesService {
  constructor(
    private readonly tb: ThingsboardClientService,
    private readonly redis: RedisService,
  ) {}

  async getAttributes(
    entityId: string,
    entityType: EntityType,
    scope: TbAttributeScope,
    keys?: string[],
  ): Promise<TbAttribute[]> {
    const keysSuffix = keys ? [...keys].sort().join(',') : 'all';
    const cacheKey = `attrs:${entityType}:${entityId}:${scope}:${keysSuffix}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as TbAttribute[];
    }

    const params = new URLSearchParams();
    if (keys && keys.length > 0) {
      params.set('keys', keys.join(','));
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const attributes = await this.tb.request<TbAttribute[]>(
      'GET',
      `/api/plugins/telemetry/${entityType}/${entityId}/values/attributes/${scope}${query}`,
    );

    await this.redis.set(cacheKey, JSON.stringify(attributes), ATTRIBUTES_CACHE_TTL_SECONDS);
    return attributes;
  }

  async setAttributes(
    entityId: string,
    entityType: EntityType,
    scope: TbAttributeScope,
    values: Record<string, unknown>,
  ): Promise<void> {
    await this.tb.request<void>(
      'POST',
      `/api/plugins/telemetry/${entityType}/${entityId}/${scope}`,
      values,
    );

    await this.redis.delByPattern(`attrs:${entityType}:${entityId}:${scope}:*`);
  }
}
