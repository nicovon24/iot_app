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
  /** CUSTOMER only — the parent Customer this one was created under, if any (sub-customer tree). */
  parentCustomerId?: EntityRefLink;
  additionalInfo?: unknown;
}

export interface PageData<T> {
  data: T[];
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
}

export interface UseEntitiesParams {
  page?: number;
  pageSize?: number;
  textSearch?: string;
  sortProperty?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface UseEntitiesOptions {
  /** Skip the request entirely — e.g. a widget bound to one entity has no use for the list. */
  enabled?: boolean;
  /** Poll interval in ms. Used by "all entities" widgets so a newly registered device shows
   * up on its own, without the user reopening the dashboard. */
  refetchInterval?: number;
}
