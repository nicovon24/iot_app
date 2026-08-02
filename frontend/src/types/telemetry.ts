/** value is always a string, never a JS number — matches .paul/rules/api.md and the backend's own TelemetryValue contract. */
export interface TelemetryValue {
  value: string;
  ts: number;
}

export type TelemetryLatest = Record<string, TelemetryValue>;
