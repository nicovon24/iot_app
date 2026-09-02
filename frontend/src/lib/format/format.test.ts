/**
 * The timestamp heuristic is the one piece of formatting logic that can silently corrupt a
 * display (turning a sensor reading into a date, or leaving a timestamp as an unreadable number).
 */
import { describe, expect, it } from 'vitest';
import { formatMaybeTimestamp, formatTelemetryValue } from './format';

describe('formatMaybeTimestamp', () => {
  it('formats real epoch-ms timestamps as dates', () => {
    expect(formatMaybeTimestamp(String(Date.now()))).toBeTruthy();
    expect(formatMaybeTimestamp('1700000000000')).toBeTruthy();
  });

  it('never mistakes a telemetry reading for a timestamp', () => {
    expect(formatMaybeTimestamp('24.6')).toBeUndefined();
    expect(formatMaybeTimestamp('1500')).toBeUndefined();
    expect(formatMaybeTimestamp('0')).toBeUndefined();
    expect(formatMaybeTimestamp('-70')).toBeUndefined();
    expect(formatMaybeTimestamp('1700000000')).toBeUndefined(); // epoch seconds are out of range
    expect(formatMaybeTimestamp('RUNNING')).toBeUndefined();
    expect(formatMaybeTimestamp(undefined)).toBeUndefined();
  });
});

describe('formatTelemetryValue', () => {
  it('rounds numeric values, leaves non-numeric strings untouched', () => {
    expect(formatTelemetryValue('24.6789')).toBe('24.68');
    expect(formatTelemetryValue('RUNNING')).toBe('RUNNING');
  });

  it('applies unit/decimals options', () => {
    expect(formatTelemetryValue('24.6789', { unit: '°C' })).toBe('24.68 °C');
    expect(formatTelemetryValue('24.6789', { decimals: 0 })).toBe('25');
  });

  it('never appends a unit suffix to a state string', () => {
    expect(formatTelemetryValue('RUNNING', { unit: '°C' })).toBe('RUNNING');
  });
});
