import type { AlarmSeverity } from '@/types';

/**
 * Categorical series colors for multi-series charts.
 *
 * These are the eight dark-mode steps of the reference categorical palette, validated as a
 * set against this app's real chart surface — `--color-surface-card` (rgba(19,26,23,.72))
 * composited over `--color-surface` (#050807), i.e. ~#0f1513. Result: lightness band, chroma
 * floor, adjacent-pair CVD separation, normal-vision separation and 3:1 contrast all pass
 * (worst is #008300 at 3.73:1). Re-run the validator before changing any hex or the order:
 * the *ordering* is the colorblind-safety mechanism, not decoration.
 *
 * These survived the move to the near-black surface untouched, and with more headroom than
 * they had on the old slate — a darker backdrop lifts every one of these ratios.
 *
 * Deliberately NOT derived from --color-accent: the accent is a single aqua green used for
 * UI affordances, and tinting eight series from one hue would make them indistinguishable.
 */
export const SERIES_COLORS = [
  '#3987e5', // blue
  '#d95926', // orange
  '#199e70', // aqua
  '#c98500', // yellow
  '#d55181', // magenta
  '#008300', // green
  '#9085e9', // violet
  '#e66767', // red
] as const;

/**
 * Hard cap on plotted series. A ninth series would have to invent a hue, which breaks the
 * validated set — and 30 lines on one chart is unreadable spaghetti regardless of color.
 * Callers render the first N and tell the user how many were left out, rather than silently
 * truncating or cycling colors back to slot 1 (two entities sharing a color is worse than
 * an honest "showing 8 of 30").
 */
export const MAX_SERIES = SERIES_COLORS.length;

/** Color for series `index`. Assigned in fixed slot order and never cycled — see MAX_SERIES. */
export function seriesColor(index: number): string {
  return SERIES_COLORS[index] ?? SERIES_COLORS[SERIES_COLORS.length - 1];
}

/**
 * Sequential scale for magnitude — heatmap cells, density maps, anything where the question is
 * "how much" rather than "which one".
 *
 * A separate concern from SERIES_COLORS: a categorical palette answers identity, and using it
 * for magnitude would imply that orange and green are different *kinds* of value rather than
 * different *amounts*.
 *
 * This is the YlOrRd ramp (ColorBrewer), the conventional "heat" scale. Lightness falls
 * monotonically from step to step, which is what makes the order survive grayscale printing
 * and every CVD type — hue alone never carries the ranking.
 *
 * Seven discrete steps rather than a continuous gradient: nobody can map a continuous color
 * back to a value without a legend, and discrete bins make the legend honest.
 */
export const HEAT_COLORS = [
  '#ffeda0', // coldest
  '#fed976',
  '#feb24c',
  '#fd8d3c',
  '#fc4e2a',
  '#e31a1c',
  '#b10026', // hottest
] as const;

/**
 * Cells with no data at all. Distinct from the coldest step so "zero" and "never reported" are
 * never confused — spotting gaps is half of what a heatmap is for.
 *
 * A translucent neutral rather than `--color-border`: it has to sit a step above the card, and
 * the border token is nearly invisible against the dark surface, which made a sparse grid look
 * like a handful of stray dots floating in an empty panel.
 */
export const HEAT_EMPTY = 'rgba(198, 226, 216, 0.12)';

/**
 * Alarm severity — an ordered scale, so it descends in heat rather than changing hue per step,
 * and the ordering carries the ranking even in grayscale.
 *
 * This lived in three places before: the donut cell, the alarm chips and the gallery preview
 * each kept a private copy, and they had already drifted — the chips collapsed CRITICAL and
 * MAJOR onto one red and WARNING and MINOR onto one amber, so a chip and a slice describing
 * the same alarm disagreed on screen.
 *
 * Every step clears 4.5:1 on the card, because these are used as chip *text* as well as chart
 * fills. That is also a fix: the old CRITICAL (#dc2626) measured 3.82:1 as a chip label.
 */
export const SEVERITY_COLORS: Record<AlarmSeverity, string> = {
  CRITICAL: '#ff5f56',
  MAJOR: '#ff9a52',
  WARNING: '#fbbf24',
  MINOR: '#d8db5f',
  INDETERMINATE: '#8ca79c',
};

/**
 * Colour for a severity that arrives as a plain string. The alarm donut groups by a field
 * chosen at runtime, so the key is only known to be a severity when `groupBy` says so and
 * the type can't follow that. An unrecognised value falls back to INDETERMINATE, which is
 * what it is, rather than rendering a slice with no colour at all.
 */
export function severityColor(severity: string): string {
  return SEVERITY_COLORS[severity as AlarmSeverity] ?? SEVERITY_COLORS.INDETERMINATE;
}

/**
 * Ink plus its own translucent fill, for a severity chip. Takes a plain string and routes
 * through severityColor() so an unrecognised severity degrades to INDETERMINATE rather
 * than to `background: "undefined26"`, which the browser drops and which renders as an
 * unstyled chip that looks like a layout bug rather than unknown data.
 */
export function severityChipStyle(severity: string) {
  const color = severityColor(severity);
  return { color, background: `${color}26` };
}

/**
 * Bins `value` into a HEAT_COLORS step, given the range it sits in.
 *
 * `undefined` (no reading) returns HEAT_EMPTY rather than the coldest step. A flat range
 * (min === max, every value identical) pins to the middle step: there's no variation to show,
 * and painting everything "hottest" would overstate it.
 */
export function heatColor(value: number | undefined, min: number, max: number): string {
  if (value === undefined || !Number.isFinite(value)) return HEAT_EMPTY;
  if (max <= min) return HEAT_COLORS[Math.floor(HEAT_COLORS.length / 2)];
  const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const index = Math.min(HEAT_COLORS.length - 1, Math.floor(ratio * HEAT_COLORS.length));
  return HEAT_COLORS[index];
}
