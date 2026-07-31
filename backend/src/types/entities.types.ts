export type EntityType = 'DEVICE' | 'ASSET' | 'CUSTOMER';

export interface EntityRef {
  id: string;
  type: EntityType;
  name: string;
  label?: string;
  tenantId?: string;
  customerId?: string;
  assetProfileId?: string;
  ownerId?: string;
  additionalInfo?: unknown;
}
