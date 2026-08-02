export type AlarmSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'WARNING' | 'INDETERMINATE';
export type AlarmStatus = 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'CLEARED_UNACK' | 'CLEARED_ACK';

export interface AlarmEntityRef {
  id: string;
  entityType: string;
}

/**
 * Matches the real ThingsBoard alarm object returned as-is by the backend
 * (GET /alarms, GET /entities/:id/alarms, and the alarms WS gateway all pass
 * through TB's native alarm shape, not a flattened DTO) — confirmed via a
 * live GET /alarms call during 05-02 verification. `id`/`originator` are
 * nested {id, entityType} refs, not plain strings.
 */
export interface Alarm {
  id: AlarmEntityRef;
  type: string;
  name?: string;
  severity: AlarmSeverity;
  status: AlarmStatus;
  originator: AlarmEntityRef;
  originatorName?: string;
  originatorLabel?: string;
  startTs: number;
  endTs: number;
  ackTs: number;
  clearTs: number;
  acknowledged?: boolean;
  cleared?: boolean;
  details?: unknown;
}
