/**
 * Self-check for mapping a stored time window back onto the picker's dropdown.
 *
 * The picker used to hold this in `useState(() => …)`, which runs once — it mounted before the
 * dashboard query resolved, latched onto the default, and never caught up. A saved 30-day
 * window then displayed as "Last hour", which read as "the window didn't save", and re-saving
 * from that state wrote the stale selection back over the stored one.
 *
 * Run with: npx tsx src/dashboards/canvas/time-window.check.ts
 */
import assert from 'node:assert';
import { TIME_WINDOW_PRESETS } from './TimeWindowPicker';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Mirrors presetValueFor in TimeWindowPicker. */
function presetValueFor(window: { kind: 'LAST'; ms: number } | { kind: 'FIXED' } | null): string {
  if (!window) return '1h';
  if (window.kind === 'FIXED') return 'custom';
  return TIME_WINDOW_PRESETS.find((p) => p.ms === window.ms)?.value ?? 'custom';
}

// Every preset must round-trip: stored ms -> the dropdown entry that produced it.
for (const preset of TIME_WINDOW_PRESETS) {
  assert.strictEqual(
    presetValueFor({ kind: 'LAST', ms: preset.ms }),
    preset.value,
    `${preset.label} maps back to its own dropdown entry`,
  );
}

// The presets added for historical data must actually be present — the movement heatmap needed
// a range beyond 7 days and there was none.
assert.ok(
  TIME_WINDOW_PRESETS.some((p) => p.ms === 30 * DAY),
  'a 30-day preset exists',
);
assert.ok(
  TIME_WINDOW_PRESETS.some((p) => p.ms === 90 * DAY),
  'a 90-day preset exists',
);

// Presets ascend, so the dropdown reads shortest to longest.
const spans = TIME_WINDOW_PRESETS.map((p) => p.ms);
assert.deepStrictEqual(spans, [...spans].sort((a, b) => a - b), 'presets are ordered by span');

// No duplicate spans: two entries with the same ms would make the reverse lookup ambiguous.
assert.strictEqual(new Set(spans).size, spans.length, 'preset spans are unique');

// The non-preset cases.
assert.strictEqual(presetValueFor(null), '1h', 'no stored window falls back to the default');
assert.strictEqual(presetValueFor({ kind: 'FIXED' }), 'custom', 'an absolute range shows as Custom');
assert.strictEqual(
  presetValueFor({ kind: 'LAST', ms: 3 * DAY }),
  'custom',
  'a rolling window with no matching preset shows as Custom rather than a wrong preset',
);

console.log(`time-window checks passed (${TIME_WINDOW_PRESETS.length} presets)`);
