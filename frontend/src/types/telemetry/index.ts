import type { EntityType } from '../entity';
import type { Alarm } from '../alarm';

/** value is always a string, never a JS number — matches .paul/rules/api.md and the backend's own TelemetryValue contract. */
export interface TelemetryValue {
  value: string;
  ts: number;
}

export type TelemetryLatest = Record<string, TelemetryValue>;

export interface SubscribeTarget {
  entityId: string;
  entityType: EntityType;
}

/**
 * Raw ThingsBoard timeseries-subscription wire format: per key, an array of
 * [ts, value] tuples (value always a string). This is TB's own tsSubCmds
 * payload passed straight through by the backend gateway — a different shape
 * than the REST /telemetry/latest endpoint's { [key]: { value, ts } } response.
 * Confirmed against a real live frame during 05-02 verification.
 */
export type WsTimeseriesUpdate = Record<string, [number, string][]>;

export type WsFrame =
  | { event: 'telemetry'; entityId: string; entityType: EntityType; data: WsTimeseriesUpdate }
  | { event: 'alarm'; entityId: string; entityType: EntityType; data: Alarm }
  | { event: 'error'; entityId?: string; message: string };

export type WsChannel = 'telemetry' | 'alarms';
