export type TbEntityType = 'DEVICE' | 'ASSET' | 'CUSTOMER';

export interface TbEntityId {
  id: string;
  entityType: TbEntityType;
}

export interface TbDevice {
  id: TbEntityId;
  name: string;
  type: string;
  label?: string;
  customerId?: TbEntityId;
}

export interface TbAsset {
  id: TbEntityId;
  name: string;
  type: string;
  label?: string;
  customerId?: TbEntityId;
}

export interface TbCustomer {
  id: TbEntityId;
  title: string;
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

export interface TbPageData<T> {
  data: T[];
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
}
