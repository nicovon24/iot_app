export type TbEntityType = 'DEVICE' | 'ASSET' | 'CUSTOMER' | 'TENANT';

export interface TbEntityId {
  id: string;
  entityType: TbEntityType;
}

export interface TbDevice {
  id: TbEntityId;
  name: string;
  type: string;
  label?: string;
  version?: number;
  tenantId?: TbEntityId;
  customerId?: TbEntityId;
  ownerId?: TbEntityId;
  additionalInfo?: unknown;
}

/**
 * `version` is ThingsBoard's optimistic-locking counter, present on recent TB
 * versions. The update methods in EntitiesService read an entity and POST it back
 * with `...existing`, so this field rides along and TB rejects a write carrying a
 * stale value instead of silently overwriting a concurrent edit. Declared rather
 * than left implicit so the read-modify-write in updateAsset/updateDevice/
 * updateCustomer is understood to depend on it.
 *
 * Optional because an older TB simply omits it — in that case those updates remain
 * last-write-wins and concurrent edits can still lose data.
 */
export interface TbAsset {
  id: TbEntityId;
  name: string;
  type: string;
  label?: string;
  version?: number;
  tenantId?: TbEntityId;
  customerId?: TbEntityId;
  assetProfileId?: TbEntityId;
  ownerId?: TbEntityId;
  additionalInfo?: unknown;
}

export interface TbCustomer {
  id: TbEntityId;
  title: string;
  version?: number;
  tenantId?: TbEntityId;
  parentCustomerId?: TbEntityId;
  ownerId?: TbEntityId;
  additionalInfo?: unknown;
}

export type TbAttributeScope = 'CLIENT_SCOPE' | 'SERVER_SCOPE' | 'SHARED_SCOPE';

export interface TbAttribute {
  key: string;
  value: unknown;
  lastUpdateTs: number;
}

export interface TbTimeseriesValue {
  ts: number;
  value: string;
}

export type TbTimeseriesLatest = Record<string, TbTimeseriesValue[]>;

export type TbAlarmSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'WARNING' | 'INDETERMINATE';
export type TbAlarmStatus = 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'CLEARED_UNACK' | 'CLEARED_ACK';

export interface TbAlarm {
  id: TbEntityId;
  type: string;
  severity: TbAlarmSeverity;
  status: TbAlarmStatus;
  originator: TbEntityId;
  startTs: number;
  endTs: number;
  ackTs: number;
  clearTs: number;
}

export interface TbLoginResponse {
  token: string;
  refreshToken: string;
}

export type TbAuthority = 'SYS_ADMIN' | 'TENANT_ADMIN' | 'CUSTOMER_USER';

export interface TbUserProfile {
  id: TbEntityId;
  email: string;
  authority: TbAuthority;
  tenantId?: TbEntityId;
  customerId?: TbEntityId;
  additionalInfo?: { appRole?: 'ADMIN' | 'READER' } & Record<string, unknown>;
}

export interface TbRelation {
  from: TbEntityId;
  to: TbEntityId;
  type: string;
  typeGroup: string;
}

export interface TbPageData<T> {
  data: T[];
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
}
