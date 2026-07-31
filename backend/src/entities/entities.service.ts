import { Injectable, NotFoundException } from '@nestjs/common';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { AppSession } from '../auth/auth.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { EntityRef, EntityType, TbAsset, TbCustomer, TbDevice, TbPageData } from '../types';

function toEntityRef(entity: TbDevice | TbAsset | TbCustomer, type: EntityType): EntityRef {
  const name = 'title' in entity ? entity.title : entity.name;
  const label = 'label' in entity ? entity.label : undefined;
  return {
    id: entity.id.id,
    type,
    name,
    label,
    tenantId: entity.tenantId?.id,
    customerId: 'customerId' in entity ? entity.customerId?.id : undefined,
    assetProfileId: 'assetProfileId' in entity ? entity.assetProfileId?.id : undefined,
    ownerId: entity.ownerId?.id,
    additionalInfo: entity.additionalInfo,
  };
}

function buildPageParams(pagination?: PaginationQueryDto): string {
  const params = new URLSearchParams();
  params.set('page', String(pagination?.page ?? 0));
  params.set('pageSize', String(pagination?.pageSize ?? 1000));
  if (pagination?.textSearch) params.set('textSearch', pagination.textSearch);
  if (pagination?.sortProperty) params.set('sortProperty', pagination.sortProperty);
  if (pagination?.sortOrder) params.set('sortOrder', pagination.sortOrder);
  return params.toString();
}

function applyClientSidePagination<T>(items: T[], pagination?: PaginationQueryDto): TbPageData<T> {
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
  constructor(private readonly tb: ThingsboardClientService) {}

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
      return applyClientSidePagination(filtered.map((c) => toEntityRef(c, 'CUSTOMER')), pagination);
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
    return applyClientSidePagination(
      textFiltered.map((e) => toEntityRef(e, type)),
      pagination,
    );
  }

  private async listUnscoped(type: EntityType, pagination?: PaginationQueryDto): Promise<TbPageData<EntityRef>> {
    const query = buildPageParams(pagination);

    if (type === 'DEVICE') {
      const page = await this.tb.request<TbPageData<TbDevice>>('GET', `/api/tenant/devices?${query}`);
      return { ...page, data: page.data.map((d) => toEntityRef(d, 'DEVICE')) };
    }

    if (type === 'ASSET') {
      const page = await this.tb.request<TbPageData<TbAsset>>('GET', `/api/tenant/assets?${query}`);
      return { ...page, data: page.data.map((a) => toEntityRef(a, 'ASSET')) };
    }

    const page = await this.tb.request<TbPageData<TbCustomer>>('GET', `/api/customers?${query}`);
    return { ...page, data: page.data.map((c) => toEntityRef(c, 'CUSTOMER')) };
  }

  async getById(id: string, type: EntityType): Promise<EntityRef> {
    const path = { DEVICE: `/api/device/${id}`, ASSET: `/api/asset/${id}`, CUSTOMER: `/api/customer/${id}` }[type];
    const entity = await this.tb.request<TbDevice | TbAsset | TbCustomer | null>('GET', path);
    if (!entity) {
      throw new NotFoundException(`${type} ${id} not found`);
    }
    return toEntityRef(entity, type);
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

  async createDevice(name: string, deviceType: string, label?: string): Promise<EntityRef> {
    const created = await this.tb.request<TbDevice>('POST', '/api/device', { name, type: deviceType, label });
    return toEntityRef(created, 'DEVICE');
  }

  async createAsset(name: string, assetType: string, label?: string): Promise<EntityRef> {
    const created = await this.tb.request<TbAsset>('POST', '/api/asset', { name, type: assetType, label });
    return toEntityRef(created, 'ASSET');
  }
}
