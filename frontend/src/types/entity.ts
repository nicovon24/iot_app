export type EntityType = 'DEVICE' | 'ASSET' | 'CUSTOMER';

export interface EntityRefLink {
  id: string;
  name?: string;
  label?: string;
}

export interface EntityRef {
  id: string;
  type: EntityType;
  name: string;
  label?: string;
  tenantId?: EntityRefLink;
  customerId?: EntityRefLink;
  assetProfileId?: EntityRefLink;
  ownerId?: EntityRefLink;
  additionalInfo?: unknown;
}

export interface PageData<T> {
  data: T[];
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
}
