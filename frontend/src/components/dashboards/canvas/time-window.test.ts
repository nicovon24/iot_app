/**
 * Mapping a stored time window back onto the picker's dropdown.
 *
 * The picker used to hold this in `useState(() => …)`, which runs once — it mounted before the
 * dashboard query resolved, latched onto the default, and never caught up. A saved 30-day
 * window then displayed as "Last hour", which read as "the window didn't save", and re-saving
 * from that state wrote the stale selection back over the stored one.
 */
import { describe, expect, it } from 'vitest';
import { TIME_WINDOW_PRESETS } from './TimeWindowPicker';

const DAY = 24 * 60 * 60_000;

/** Mirrors presetValueFor in TimeWindowPicker. */
function presetValueFor(window: { kind: 'LAST'; ms: number } | { kind: 'FIXED' } | null): string {
  if (!window) return '1h';
  if (window.kind === 'FIXED') return 'custom';
  return TIME_WINDOW_PRESETS.find((p) => p.ms === window.ms)?.value ?? 'custom';
}

describe('presetValueFor', () => {
  it.each(TIME_WINDOW_PRESETS)(
    'round-trips $label: stored ms back to its own dropdown entry',
    (preset) => {
      expect(presetValueFor({ kind: 'LAST', ms: preset.ms })).toBe(preset.value);
    },
  );

  it('includes a 30-day preset', () => {
    // The movement heatmap needed a range beyond 7 days and there was none.
    expect(TIME_WINDOW_PRESETS.some((p) => p.ms === 30 * DAY)).toBe(true);
  });

  it('includes a 90-day preset', () => {
    expect(TIME_WINDOW_PRESETS.some((p) => p.ms === 90 * DAY)).toBe(true);
  });

  it('orders presets ascending, shortest to longest', () => {
    const spans = TIME_WINDOW_PRESETS.map((p) => p.ms);
    expect(spans).toEqual([...spans].sort((a, b) => a - b));
  });

  it('has no duplicate spans (the reverse lookup would be ambiguous otherwise)', () => {
    const spans = TIME_WINDOW_PRESETS.map((p) => p.ms);
    expect(new Set(spans).size).toBe(spans.length);
  });

  it('falls back to the 1h default when no window is stored', () => {
    expect(presetValueFor(null)).toBe('1h');
  });

  it('shows an absolute range as Custom', () => {
    expect(presetValueFor({ kind: 'FIXED' })).toBe('custom');
  });

  it('shows a rolling window with no matching preset as Custom, not a wrong preset', () => {
    expect(presetValueFor({ kind: 'LAST', ms: 3 * DAY })).toBe('custom');
  });
});
