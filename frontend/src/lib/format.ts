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

/** 2001-09-09 and 2100-01-01 in epoch milliseconds. */
const EPOCH_MS_MIN = 1_000_000_000_000;
const EPOCH_MS_MAX = 4_102_444_800_000;

/**
 * Renders a value as a date when it looks like an epoch-millisecond timestamp, else undefined
 * so the caller falls back to its normal formatting.
 *
 * Fields like `lastActivityTime` arrive as raw epoch numbers indistinguishable from any other
 * numeric attribute — there's no type information to key off, so the range is the signal. The
 * window starts at 1e12 because real telemetry readings (temperatures, pressures, counters,
 * uptimes in seconds) don't reach a trillion; anything that does is a millisecond timestamp.
 * Integers only, since a fractional value is a measurement, not a timestamp.
 */
export function formatMaybeTimestamp(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const num = Number(raw);
  if (!Number.isInteger(num) || num < EPOCH_MS_MIN || num > EPOCH_MS_MAX) return undefined;
  return new Date(num).toLocaleString();
}
