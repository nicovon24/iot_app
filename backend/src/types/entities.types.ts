export type EntityType = 'DEVICE' | 'ASSET' | 'CUSTOMER';

/** An enriched reference to another TB entity — resolved name/label instead of a bare id, so a frontend can display it without a second round-trip. */
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
  /** CUSTOMER only — the parent Customer this one was created under, if any (sub-customer tree). */
  parentCustomerId?: EntityRefLink;
  additionalInfo?: unknown;
}
