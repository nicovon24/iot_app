import { Injectable, NotFoundException } from '@nestjs/common';
import { ThingsboardClientService } from '../thingsboard/thingsboard-client.service';
import { EntityRef, EntityType, TbAsset, TbCustomer, TbDevice, TbPageData } from '../types';

function toEntityRef(entity: TbDevice | TbAsset | TbCustomer, type: EntityType): EntityRef {
  const name = 'title' in entity ? entity.title : entity.name;
  const label = 'label' in entity ? entity.label : undefined;
  return {
    id: entity.id.id,
    type,
    name,
    label,
  };
}

@Injectable()
export class EntitiesService {
  constructor(private readonly tb: ThingsboardClientService) {}

  async list(type: EntityType): Promise<EntityRef[]> {
    if (type === 'DEVICE') {
      const page = await this.tb.request<TbPageData<TbDevice>>(
        'GET',
        '/api/tenant/devices?pageSize=100&page=0',
      );
      return page.data.map((d) => toEntityRef(d, 'DEVICE'));
    }

    if (type === 'ASSET') {
      const page = await this.tb.request<TbPageData<TbAsset>>(
        'GET',
        '/api/tenant/assets?pageSize=100&page=0',
      );
      return page.data.map((a) => toEntityRef(a, 'ASSET'));
    }

    const page = await this.tb.request<TbPageData<TbCustomer>>('GET', '/api/customers?pageSize=100&page=0');
    return page.data.map((c) => toEntityRef(c, 'CUSTOMER'));
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
