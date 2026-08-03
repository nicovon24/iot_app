/**
 * Rounds a numeric telemetry value to at most `maxDecimals` places for display.
 * Non-numeric values (e.g. "state": "RUNNING", "alarmCode": "NONE") pass through
 * unchanged — telemetry values are untyped strings by design (.paul/rules/api.md),
 * this only affects how they're rendered, never the underlying value/type.
 */
export function formatTelemetryValue(raw: string | undefined, maxDecimals = 2): string | undefined {
  if (raw === undefined) return undefined;
  const num = Number(raw);
  if (Number.isNaN(num)) return raw;
  return String(Number(num.toFixed(maxDecimals)));
}
