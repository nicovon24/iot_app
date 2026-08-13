/**
 * Self-check for the timestamp heuristic in format.ts — the one piece of formatting logic that
 * can silently corrupt a display (turning a sensor reading into a date, or leaving a timestamp
 * as an unreadable number). Run with: npx tsx src/lib/format/format.check.ts
 */
import assert from 'node:assert';
import { formatMaybeTimestamp, formatTelemetryValue } from './format';

// Real epoch-ms timestamps format as dates.
assert.ok(formatMaybeTimestamp(String(Date.now())), 'now should format');
assert.ok(formatMaybeTimestamp('1700000000000'), '2023 timestamp should format');

// Telemetry readings must never be mistaken for timestamps.
assert.strictEqual(formatMaybeTimestamp('24.6'), undefined, 'temperature is not a timestamp');
assert.strictEqual(formatMaybeTimestamp('1500'), undefined, 'a counter is not a timestamp');
assert.strictEqual(formatMaybeTimestamp('0'), undefined, 'zero is not a timestamp');
assert.strictEqual(formatMaybeTimestamp('-70'), undefined, 'rssi is not a timestamp');
assert.strictEqual(formatMaybeTimestamp('1700000000'), undefined, 'epoch seconds are out of range');
assert.strictEqual(formatMaybeTimestamp('RUNNING'), undefined, 'non-numeric is not a timestamp');
assert.strictEqual(formatMaybeTimestamp(undefined), undefined, 'undefined passes through');

// Existing rounding behavior is unchanged.
assert.strictEqual(formatTelemetryValue('24.6789'), '24.68');
assert.strictEqual(formatTelemetryValue('RUNNING'), 'RUNNING');

// Unit/decimals options.
assert.strictEqual(formatTelemetryValue('24.6789', { unit: '°C' }), '24.68 °C');
assert.strictEqual(formatTelemetryValue('24.6789', { decimals: 0 }), '25');
assert.strictEqual(formatTelemetryValue('RUNNING', { unit: '°C' }), 'RUNNING', 'a state string never gets a unit suffix');

console.log('format.ts checks passed');
