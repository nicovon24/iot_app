export interface TelemetryValue {
  value: string;
  ts: number;
}

export type TelemetryLatest = Record<string, TelemetryValue>;
