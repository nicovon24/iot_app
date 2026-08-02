import { Injectable, NotFoundException } from '@nestjs/common';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { RedisService } from '../thingsboard/redis.service';
import { AppSession } from '../auth/auth.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { EntityRef, EntityRefLink, EntityType, TbAsset, TbCustomer, TbDevice, TbPageData } from '../types';

type RefKind = 'tenant' | 'customer' | 'assetProfile';

/** Reference names/labels change rarely — a much longer TTL than the ~3s telemetry cache. */
const REF_CACHE_TTL_SECONDS = 300;

export function buildPageParams(pagination?: PaginationQueryDto): string {
  const params = new URLSearchParams();
  params.set('page', String(pagination?.page ?? 0));
  params.set('pageSize', String(pagination?.pageSize ?? 1000));
  if (pagination?.textSearch) params.set('textSearch', pagination.textSearch);
  if (pagination?.sortProperty) params.set('sortProperty', pagination.sortProperty);
  if (pagination?.sortOrder) params.set('sortOrder', pagination.sortOrder);
  return params.toString();
}

export function applyClientSidePagination<T>(items: T[], pagination?: PaginationQueryDto): TbPageData<T> {
  const pageSize = pagination?.pageSize;
  const page = pagination?.page ?? 0;
  if (!pageSize) {
    return { data: items, totalPages: 1, totalElements: items.length, hasNext: false };
  }
  const start = page * pageSize;
  const data = items.slice(start, start + pageSize);
  const totalPages = Math.ceil(items.length / pageSize);
  return { data, totalPages, totalElements: items.length, hasNext: page + 1 < totalPages };
}

@Injectable()
export class EntitiesService {
  constructor(
    private readonly tb: ThingsboardClientService,
    private readonly redis: RedisService,
  ) {}

  private isScoped(session?: AppSession | null): session is AppSession {
    return !!session && session.authority !== 'TENANT_ADMIN' && session.authority !== 'SYS_ADMIN';
  }

  /**
   * Resolves the caller's own customerId plus every descendant sub-customer, walking
   * ThingsBoard's native `parentCustomerId` field (see CustomerScopeGuard). Used to scope
   * list endpoints for CUSTOMER_USER sessions — TENANT_ADMIN/SYS_ADMIN stay unscoped.
   */
  async resolveScopedCustomerIds(rootCustomerId: string): Promise<string[]> {
    const page = await this.tb.request<TbPageData<TbCustomer>>('GET', '/api/customers?pageSize=1000&page=0');
    const all = page.data;
    const result = new Set<string>([rootCustomerId]);
    let added = true;
    while (added) {
      added = false;
      for (const c of all) {
        const id = c.id.id;
        const parentId = c.parentCustomerId?.id;
        if (parentId && result.has(parentId) && !result.has(id)) {
          result.add(id);
          added = true;
        }
      }
    }
    return [...result];
  }

  /**
   * Batched + Redis-cached resolution of tenant/customer/assetProfile reference names,
   * deduped by unique id across a whole entity list — never one lookup per entity (that
   * would reintroduce N+1). Individual failures degrade to a missing map entry (toEntityRef
   * then renders `{id}` with no name/label) rather than failing the whole batch.
   */
  private async resolveRefs(refs: { id: string; kind: RefKind }[]): Promise<Map<string, EntityRefLink>> {
    const result = new Map<string, EntityRefLink>();
    const byKind = new Map<RefKind, Set<string>>();
    for (const { id, kind } of refs) {
      if (!byKind.has(kind)) byKind.set(kind, new Set());
      byKind.get(kind)!.add(id);
    }

    for (const [kind, ids] of byKind) {
      const uncached: string[] = [];
      for (const id of ids) {
        const cached = await this.redis.get(`refname:${kind}:${id}`);
        if (cached) {
          result.set(`${kind}:${id}`, JSON.parse(cached) as EntityRefLink);
        } else {
          uncached.push(id);
        }
      }
      if (uncached.length === 0) continue;

      if (kind === 'customer') {
        // One call resolves every uncached customer id at once — TB has no per-customer-name
        // batch endpoint, but a single full-page fetch is far cheaper than N individual GETs.
        try {
          const page = await this.tb.request<TbPageData<TbCustomer>>('GET', '/api/customers?pageSize=1000&page=0');
          for (const id of uncached) {
            const customer = page.data.find((c) => c.id.id === id);
            if (customer) {
              const link: EntityRefLink = { id, name: customer.title };
              result.set(`customer:${id}`, link);
              await this.redis.set(`refname:customer:${id}`, JSON.stringify(link), REF_CACHE_TTL_SECONDS);
            }
          }
        } catch {
          // Leave unresolved ids out of the map — toEntityRef degrades to {id} only.
        }
        continue;
      }

      // tenant / assetProfile: no batch endpoint, resolve individually (in this project's
      // single-tenant model there's realistically only ever one unique tenantId).
      const path = kind === 'tenant' ? '/api/tenant' : '/api/assetProfile';
      await Promise.all(
        uncached.map(async (id) => {
          try {
            const entity = await this.tb.request<{ title?: string; name?: string }>('GET', `${path}/${id}`);
            const link: EntityRefLink = { id, name: entity.title ?? entity.name };
            result.set(`${kind}:${id}`, link);
            await this.redis.set(`refname:${kind}:${id}`, JSON.stringify(link), REF_CACHE_TTL_SECONDS);
          } catch {
            // Stale/deleted reference — degrade to {id} only, don't fail the whole batch.
          }
        }),
      );
    }

    return result;
  }

  private toEntityRefs(
    entities: (TbDevice | TbAsset | TbCustomer)[],
    type: EntityType,
    refMap: Map<string, EntityRefLink>,
  ): EntityRef[] {
    return entities.map((entity) => {
      const name = 'title' in entity ? entity.title : entity.name;
      const label = 'label' in entity ? entity.label : undefined;
      const tenantId = entity.tenantId?.id;
      const customerId = 'customerId' in entity ? entity.customerId?.id : undefined;
      const assetProfileId = 'assetProfileId' in entity ? entity.assetProfileId?.id : undefined;
      const ownerId = entity.ownerId?.id;
      const ownerKind: RefKind | undefined =
        entity.ownerId?.entityType === 'TENANT' ? 'tenant' : entity.ownerId?.entityType === 'CUSTOMER' ? 'customer' : undefined;

      return {
        id: entity.id.id,
        type,
        name,
        label,
        tenantId: tenantId ? refMap.get(`tenant:${tenantId}`) ?? { id: tenantId } : undefined,
        customerId: customerId ? refMap.get(`customer:${customerId}`) ?? { id: customerId } : undefined,
        assetProfileId: assetProfileId ? refMap.get(`assetProfile:${assetProfileId}`) ?? { id: assetProfileId } : undefined,
        ownerId: ownerId ? (ownerKind ? refMap.get(`${ownerKind}:${ownerId}`) : undefined) ?? { id: ownerId } : undefined,
        additionalInfo: entity.additionalInfo,
      };
    });
  }

  /** Collects every unique {id,kind} reference needed to enrich this batch of raw entities. */
  private collectRefs(entities: (TbDevice | TbAsset | TbCustomer)[]): { id: string; kind: RefKind }[] {
    const refs: { id: string; kind: RefKind }[] = [];
    for (const entity of entities) {
      if (entity.tenantId?.id) refs.push({ id: entity.tenantId.id, kind: 'tenant' });
      if ('customerId' in entity && entity.customerId?.id) refs.push({ id: entity.customerId.id, kind: 'customer' });
      if ('assetProfileId' in entity && entity.assetProfileId?.id) refs.push({ id: entity.assetProfileId.id, kind: 'assetProfile' });
      if (entity.ownerId?.id) {
        if (entity.ownerId.entityType === 'TENANT') refs.push({ id: entity.ownerId.id, kind: 'tenant' });
        else if (entity.ownerId.entityType === 'CUSTOMER') refs.push({ id: entity.ownerId.id, kind: 'customer' });
      }
    }
    return refs;
  }

  private async mapWithRefs(entities: (TbDevice | TbAsset | TbCustomer)[], type: EntityType): Promise<EntityRef[]> {
    const refMap = await this.resolveRefs(this.collectRefs(entities));
    return this.toEntityRefs(entities, type, refMap);
  }

  async list(
    type: EntityType,
    session?: AppSession | null,
    pagination?: PaginationQueryDto,
  ): Promise<TbPageData<EntityRef>> {
    if (!this.isScoped(session)) {
      return this.listUnscoped(type, pagination);
    }

    const customerId = session.customerId;
    if (!customerId) {
      return { data: [], totalPages: 0, totalElements: 0, hasNext: false };
    }
    const scopedCustomerIds = await this.resolveScopedCustomerIds(customerId);

    if (type === 'CUSTOMER') {
      const page = await this.tb.request<TbPageData<TbCustomer>>('GET', '/api/customers?pageSize=1000&page=0');
      const filtered = page.data.filter((c) => scopedCustomerIds.includes(c.id.id));
      const mapped = await this.mapWithRefs(filtered, 'CUSTOMER');
      return applyClientSidePagination(mapped, pagination);
    }

    const path = type === 'DEVICE' ? 'devices' : 'assets';
    const perCustomer = await Promise.all(
      scopedCustomerIds.map((cid) =>
        this.tb.request<TbPageData<TbDevice | TbAsset>>('GET', `/api/customer/${cid}/${path}?pageSize=1000&page=0`),
      ),
    );
    const merged = perCustomer.flatMap((p) => p.data);
    const textFiltered = pagination?.textSearch
      ? merged.filter((e) => e.name.toLowerCase().includes(pagination.textSearch!.toLowerCase()))
      : merged;
    const mapped = await this.mapWithRefs(textFiltered, type);
    return applyClientSidePagination(mapped, pagination);
  }

  private async listUnscoped(type: EntityType, pagination?: PaginationQueryDto): Promise<TbPageData<EntityRef>> {
    const query = buildPageParams(pagination);

    if (type === 'DEVICE') {
      const page = await this.tb.request<TbPageData<TbDevice>>('GET', `/api/tenant/devices?${query}`);
      return { ...page, data: await this.mapWithRefs(page.data, 'DEVICE') };
    }

    if (type === 'ASSET') {
      const page = await this.tb.request<TbPageData<TbAsset>>('GET', `/api/tenant/assets?${query}`);
      return { ...page, data: await this.mapWithRefs(page.data, 'ASSET') };
    }

    const page = await this.tb.request<TbPageData<TbCustomer>>('GET', `/api/customers?${query}`);
    return { ...page, data: await this.mapWithRefs(page.data, 'CUSTOMER') };
  }

  async getById(id: string, type: EntityType): Promise<EntityRef> {
    const path = { DEVICE: `/api/device/${id}`, ASSET: `/api/asset/${id}`, CUSTOMER: `/api/customer/${id}` }[type];
    const entity = await this.tb.request<TbDevice | TbAsset | TbCustomer | null>('GET', path);
    if (!entity) {
      throw new NotFoundException(`${type} ${id} not found`);
    }
    const [mapped] = await this.mapWithRefs([entity], type);
    return mapped;
  }

  /**
   * Resolves the ThingsBoard customerId that owns this entity — for CUSTOMER type the
   * entity's own id is the customerId. Used by CustomerScopeGuard, not for entity display.
   */
  async getOwningCustomerId(id: string, type: EntityType): Promise<string | null> {
    if (type === 'CUSTOMER') {
      return id;
    }
    const path = { DEVICE: `/api/device/${id}`, ASSET: `/api/asset/${id}`, CUSTOMER: `/api/customer/${id}` }[type];
    const entity = await this.tb.request<TbDevice | TbAsset>('GET', path);
    return entity.customerId?.id ?? null;
  }

  async createAsset(name: string, assetType: string, label?: string): Promise<EntityRef> {
    const created = await this.tb.request<TbAsset>('POST', '/api/asset', { name, type: assetType, label });
    const [mapped] = await this.mapWithRefs([created], 'ASSET');
    return mapped;
  }

  async createCustomer(title: string, parentCustomerId?: string): Promise<EntityRef> {
    const created = await this.tb.request<TbCustomer>('POST', '/api/customer', {
      title,
      ...(parentCustomerId ? { parentCustomerId: { id: parentCustomerId, entityType: 'CUSTOMER' } } : {}),
    });
    const [mapped] = await this.mapWithRefs([created], 'CUSTOMER');
    return mapped;
  }

  async assignAssetToCustomer(customerId: string, assetId: string): Promise<void> {
    // This TB Cloud instance is Professional Edition — the CE-only `/api/customer/{id}/asset/{id}`
    // endpoint 404s ("No static resource"); PE uses the generic owner-reassignment API instead.
    await this.tb.request('POST', `/api/owner/CUSTOMER/${customerId}/ASSET/${assetId}`);
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.tb.request('DELETE', `/api/customer/${id}`);
  }

  async deleteAsset(id: string): Promise<void> {
    await this.tb.request('DELETE', `/api/asset/${id}`);
  }

  /** Creates a real ThingsBoard relation (first real use of the Relations API in this codebase). */
  async createRelation(
    fromId: string,
    fromType: 'CUSTOMER' | 'ASSET',
    toId: string,
    toType: 'ASSET',
  ): Promise<void> {
    await this.tb.request('POST', '/api/relation', {
      from: { id: fromId, entityType: fromType },
      to: { id: toId, entityType: toType },
      type: 'Contains',
      typeGroup: 'COMMON',
    });
  }
}
