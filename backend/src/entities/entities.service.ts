import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { RedisService } from '../thingsboard/redis.service';
import { AppSession } from '../auth/auth.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  EntityRef,
  EntityType,
  TbAsset,
  TbCustomer,
  TbDevice,
  TbPageData,
  TbRelation,
} from '../types';
import { EntityRefResolver, TB_NULL_CUSTOMER_ID } from './entity-ref-resolver';
import { fetchAllPages } from './fetch-all-pages';

/** Descendant-set cache TTL. Sub-customers are created rarely, and only by a
 *  sysadmin — whose own session bypasses scoping anyway — so a short window of
 *  staleness costs nothing. Invalidated explicitly on customer create/delete. */
const SCOPE_CACHE_TTL_SECONDS = 60;

export function buildPageParams(pagination?: PaginationQueryDto): string {
  const params = new URLSearchParams();
  params.set('page', String(pagination?.page ?? 0));
  params.set('pageSize', String(pagination?.pageSize ?? 1000));
  if (pagination?.textSearch) params.set('textSearch', pagination.textSearch);
  if (pagination?.sortProperty) params.set('sortProperty', pagination.sortProperty);
  if (pagination?.sortOrder) params.set('sortOrder', pagination.sortOrder);
  return params.toString();
}

export function applyClientSidePagination<T>(
  items: T[],
  pagination?: PaginationQueryDto,
): TbPageData<T> {
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
  private readonly refResolver: EntityRefResolver;

  constructor(
    private readonly tb: ThingsboardClientService,
    private readonly redis: RedisService,
  ) {
    this.refResolver = new EntityRefResolver(tb, redis);
  }

  private isScoped(session?: AppSession | null): session is AppSession {
    return !!session && session.authority !== 'TENANT_ADMIN' && session.authority !== 'SYS_ADMIN';
  }

  /**
   * Resolves the caller's own customerId plus every descendant sub-customer, walking
   * ThingsBoard's native `parentCustomerId` field (see CustomerScopeGuard). Used to scope
   * list endpoints for CUSTOMER_USER sessions — TENANT_ADMIN/SYS_ADMIN stay unscoped.
   */
  async resolveScopedCustomerIds(rootCustomerId: string): Promise<string[]> {
    // Runs on every scoped list and every isInScope call, and fetches the whole
    // customer table each time — the single hottest uncached path in the backend.
    const cacheKey = `scope:${rootCustomerId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as string[];

    const all = await fetchAllPages<TbCustomer>(this.tb, '/api/customers');
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

    const ids = [...result];
    await this.redis.set(cacheKey, JSON.stringify(ids), SCOPE_CACHE_TTL_SECONDS);
    return ids;
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
      // applyClientSidePagination below slices in memory, so it needs the complete
      // set — a truncated first page would silently hide customers.
      const allCustomers = await fetchAllPages<TbCustomer>(this.tb, '/api/customers');
      const filtered = allCustomers.filter((c) => scopedCustomerIds.includes(c.id.id));
      const mapped = await this.refResolver.mapWithRefs(filtered, 'CUSTOMER');
      return applyClientSidePagination(mapped, pagination);
    }

    const path = type === 'DEVICE' ? 'devices' : 'assets';
    const perCustomer = await Promise.all(
      scopedCustomerIds.map((cid) =>
        fetchAllPages<TbDevice | TbAsset>(this.tb, `/api/customer/${cid}/${path}`),
      ),
    );
    const merged = perCustomer.flat();
    const textFiltered = pagination?.textSearch
      ? merged.filter((e) => e.name.toLowerCase().includes(pagination.textSearch!.toLowerCase()))
      : merged;
    const mapped = await this.refResolver.mapWithRefs(textFiltered, type);
    return applyClientSidePagination(mapped, pagination);
  }

  private async listUnscoped(
    type: EntityType,
    pagination?: PaginationQueryDto,
  ): Promise<TbPageData<EntityRef>> {
    const query = buildPageParams(pagination);

    if (type === 'DEVICE') {
      const page = await this.tb.request<TbPageData<TbDevice>>(
        'GET',
        `/api/tenant/devices?${query}`,
      );
      return { ...page, data: await this.refResolver.mapWithRefs(page.data, 'DEVICE') };
    }

    if (type === 'ASSET') {
      const page = await this.tb.request<TbPageData<TbAsset>>('GET', `/api/tenant/assets?${query}`);
      return { ...page, data: await this.refResolver.mapWithRefs(page.data, 'ASSET') };
    }

    const page = await this.tb.request<TbPageData<TbCustomer>>('GET', `/api/customers?${query}`);
    return { ...page, data: await this.refResolver.mapWithRefs(page.data, 'CUSTOMER') };
  }

  async getById(id: string, type: EntityType): Promise<EntityRef> {
    const path = {
      DEVICE: `/api/device/${id}`,
      ASSET: `/api/asset/${id}`,
      CUSTOMER: `/api/customer/${id}`,
    }[type];
    const entity = await this.tb.request<TbDevice | TbAsset | TbCustomer | null>('GET', path);
    if (!entity) {
      throw new NotFoundException(`${type} ${id} not found`);
    }
    const [mapped] = await this.refResolver.mapWithRefs([entity], type);
    return mapped;
  }

  /**
   * Resolves the ThingsBoard customerId that owns this entity — for CUSTOMER type the
   * entity's own id is the customerId. Used by CustomerScopeGuard, not for entity display.
   * Returns null both when TB has no customerId at all and when it's TB's own
   * "unassigned" placeholder — callers must not treat the placeholder as a real owner.
   */
  async getOwningCustomerId(id: string, type: EntityType): Promise<string | null> {
    if (type === 'CUSTOMER') {
      return id;
    }
    const path = {
      DEVICE: `/api/device/${id}`,
      ASSET: `/api/asset/${id}`,
      CUSTOMER: `/api/customer/${id}`,
    }[type];
    const entity = await this.tb.request<TbDevice | TbAsset>('GET', path);
    const customerId = entity.customerId?.id;
    return customerId && customerId !== TB_NULL_CUSTOMER_ID ? customerId : null;
  }

  /**
   * The single scoping decision for whether `session` may act on `entityId` — TENANT_ADMIN/
   * SYS_ADMIN bypass entirely, a CUSTOMER_USER may only reach its own customer or a
   * descendant sub-customer's entities (reuses `resolveScopedCustomerIds`, the same
   * descendant-resolution `list()` already relies on). Lets callers outside the guard layer
   * (e.g. AssetsService.linkDevice) apply the same rule CustomerScopeGuard enforces on
   * `:id`-scoped routes, for a body field (`deviceId`) the guard itself never sees.
   */
  async isInScope(
    session: AppSession | null,
    entityId: string,
    entityType: EntityType,
  ): Promise<boolean> {
    // Fail closed. A caller that forgets to pass the session gets nothing rather
    // than everything — the permissive default was a trap for the next route
    // added. @Public() routes have no session and must skip this call entirely.
    if (!session) return false;
    if (session.authority === 'TENANT_ADMIN' || session.authority === 'SYS_ADMIN') return true;
    if (!session.customerId) return false;

    const targetCustomerId = await this.getOwningCustomerId(entityId, entityType);
    if (!targetCustomerId) return false;

    const scopedIds = await this.resolveScopedCustomerIds(session.customerId);
    return scopedIds.includes(targetCustomerId);
  }

  /**
   * True when `candidateCustomerId` sits at or below `ancestorCustomerId` in the
   * ThingsBoard customer hierarchy.
   *
   * Expressed through resolveScopedCustomerIds so the hierarchy is walked in
   * exactly one place — cached, fully paginated, and cycle-safe by construction.
   * This replaces a second, upward-walking implementation that issued one
   * uncached TB request per level and could disagree with this one.
   */
  async isDescendantCustomer(
    ancestorCustomerId: string,
    candidateCustomerId: string,
  ): Promise<boolean> {
    const scopedIds = await this.resolveScopedCustomerIds(ancestorCustomerId);
    return scopedIds.includes(candidateCustomerId);
  }

  /**
   * Lets a CUSTOMER_USER claim a Device that ThingsBoard has never assigned to any real
   * Customer, assigning it into the caller's own customer. Tenant admins don't need this —
   * they can already reassign any device (including unassigned ones) via linkDevice, since
   * isInScope bypasses scoping for them entirely.
   */
  async claimDevice(deviceId: string, session: AppSession | null): Promise<EntityRef> {
    if (!session || session.authority === 'TENANT_ADMIN' || session.authority === 'SYS_ADMIN') {
      throw new ForbiddenException(
        'Claiming a device is only for Customer Users — tenant admins can assign devices directly',
      );
    }
    if (!session.customerId) {
      throw new ForbiddenException('Session has no customer scope');
    }
    const owner = await this.getOwningCustomerId(deviceId, 'DEVICE');
    if (owner) {
      throw new ConflictException('This device is already assigned to a customer');
    }
    await this.assignDeviceToCustomer(session.customerId, deviceId);
    return this.getById(deviceId, 'DEVICE');
  }

  async createAsset(name: string, assetType: string, label?: string): Promise<EntityRef> {
    const created = await this.tb.request<TbAsset>('POST', '/api/asset', {
      name,
      type: assetType,
      label,
    });
    const [mapped] = await this.refResolver.mapWithRefs([created], 'ASSET');
    return mapped;
  }

  async createCustomer(title: string, parentCustomerId?: string): Promise<EntityRef> {
    const created = await this.tb.request<TbCustomer>('POST', '/api/customer', {
      title,
      ...(parentCustomerId
        ? { parentCustomerId: { id: parentCustomerId, entityType: 'CUSTOMER' } }
        : {}),
    });
    // A new customer can change any existing customer's descendant set.
    await this.redis.delByPattern('scope:*');
    const [mapped] = await this.refResolver.mapWithRefs([created], 'CUSTOMER');
    return mapped;
  }

  async assignAssetToCustomer(customerId: string, assetId: string): Promise<void> {
    // This TB Cloud instance is Professional Edition — the CE-only `/api/customer/{id}/asset/{id}`
    // endpoint 404s ("No static resource"); PE uses the generic owner-reassignment API instead.
    await this.tb.request('POST', `/api/owner/CUSTOMER/${customerId}/ASSET/${assetId}`);
  }

  /** Same owner-reassignment as assignAssetToCustomer, for Devices — called when a Device is
   * linked to an Asset so its ThingsBoard customerId (and therefore the "Customer" column)
   * reflects the Asset's owning Customer instead of staying unassigned. */
  async assignDeviceToCustomer(customerId: string, deviceId: string): Promise<void> {
    await this.tb.request('POST', `/api/owner/CUSTOMER/${customerId}/DEVICE/${deviceId}`);
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.tb.request('DELETE', `/api/customer/${id}`);
    // Any cached scope set may now name a customer that no longer exists.
    await this.redis.delByPattern('scope:*');
  }

  async deleteAsset(id: string): Promise<void> {
    await this.tb.request('DELETE', `/api/asset/${id}`);
  }

  async updateAsset(
    id: string,
    updates: { name?: string; type?: string; label?: string },
  ): Promise<EntityRef> {
    const existing = await this.tb.request<TbAsset>('GET', `/api/asset/${id}`);
    const updated = await this.tb.request<TbAsset>('POST', '/api/asset', {
      ...existing,
      name: updates.name ?? existing.name,
      type: updates.type ?? existing.type,
      label: updates.label ?? existing.label,
    });
    const [mapped] = await this.refResolver.mapWithRefs([updated], 'ASSET');
    return mapped;
  }

  async updateDevice(id: string, updates: { label?: string }): Promise<EntityRef> {
    const existing = await this.tb.request<TbDevice>('GET', `/api/device/${id}`);
    const updated = await this.tb.request<TbDevice>('POST', '/api/device', {
      ...existing,
      label: updates.label ?? existing.label,
    });
    const [mapped] = await this.refResolver.mapWithRefs([updated], 'DEVICE');
    return mapped;
  }

  async updateCustomer(id: string, updates: { title?: string }): Promise<EntityRef> {
    const existing = await this.tb.request<TbCustomer>('GET', `/api/customer/${id}`);
    const updated = await this.tb.request<TbCustomer>('POST', '/api/customer', {
      ...existing,
      title: updates.title ?? existing.title,
    });
    // Must happen BEFORE mapWithRefs, or the resolver repopulates the cache from
    // the stale entry and the rename appears not to have taken for up to 5 minutes.
    await this.redis.del(`refname:customer:${id}`);
    const [mapped] = await this.refResolver.mapWithRefs([updated], 'CUSTOMER');
    return mapped;
  }

  /** Creates a real ThingsBoard "Contains" relation. */
  async createRelation(
    fromId: string,
    fromType: 'CUSTOMER' | 'ASSET',
    toId: string,
    toType: 'ASSET' | 'DEVICE',
  ): Promise<void> {
    await this.tb.request('POST', '/api/relation', {
      from: { id: fromId, entityType: fromType },
      to: { id: toId, entityType: toType },
      type: 'Contains',
      typeGroup: 'COMMON',
    });
  }

  /** Removes a real ThingsBoard "Contains" relation (unlink, does not delete either entity). */
  async deleteRelation(
    fromId: string,
    fromType: 'ASSET',
    toId: string,
    toType: 'DEVICE',
  ): Promise<void> {
    const params = new URLSearchParams({
      fromId,
      fromType,
      toId,
      toType,
      relationType: 'Contains',
      relationTypeGroup: 'COMMON',
    });
    await this.tb.request('DELETE', `/api/relation?${params.toString()}`);
  }

  /**
   * Direct children of a Customer or Asset via real TB "Contains" relations, split by type.
   * Powers the admin hierarchy browser — Customer→Asset (level 0) and Asset→Asset/Device chains
   * are both expressed as Contains relations, unlike the Customer→sub-Customer tree (parentCustomerId).
   */
  async getRelationChildren(
    fromId: string,
    fromType: 'CUSTOMER' | 'ASSET',
  ): Promise<{ assets: EntityRef[]; devices: EntityRef[] }> {
    const params = new URLSearchParams({ fromId, fromType, relationTypeGroup: 'COMMON' });
    const relations = await this.tb.request<TbRelation[]>(
      'GET',
      `/api/relations?${params.toString()}`,
    );
    const contains = relations.filter((r) => r.type === 'Contains');
    const assetIds = contains.filter((r) => r.to.entityType === 'ASSET').map((r) => r.to.id);
    const deviceIds = contains.filter((r) => r.to.entityType === 'DEVICE').map((r) => r.to.id);

    // Fetch raw, then map ONCE per type. getById maps each entity on its own, which
    // throws away EntityRefResolver's cross-entity reference deduplication — every
    // child could trigger its own full customer fetch, so expanding a node with
    // twenty children meant forty-plus ThingsBoard calls.
    //
    // A child can disappear between reading the relation and fetching it, which
    // getById used to surface as a 404 for the whole request; here a missing child
    // is dropped from the listing instead of failing the parent's expansion.
    const fetchRaw = async <T>(path: string): Promise<T | null> => {
      try {
        return await this.tb.request<T>('GET', path);
      } catch (err) {
        if (err instanceof HttpException && err.getStatus() === 404) return null;
        throw err;
      }
    };

    const [rawAssets, rawDevices] = await Promise.all([
      Promise.all(assetIds.map((id) => fetchRaw<TbAsset>(`/api/asset/${id}`))),
      Promise.all(deviceIds.map((id) => fetchRaw<TbDevice>(`/api/device/${id}`))),
    ]);

    const [assets, devices] = await Promise.all([
      this.refResolver.mapWithRefs(
        rawAssets.filter((a): a is TbAsset => a !== null),
        'ASSET',
      ),
      this.refResolver.mapWithRefs(
        rawDevices.filter((d): d is TbDevice => d !== null),
        'DEVICE',
      ),
    ]);
    return { assets, devices };
  }
}
