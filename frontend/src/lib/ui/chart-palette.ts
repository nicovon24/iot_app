/**
 * Categorical series colors for multi-series charts.
 *
 * These are the eight dark-mode steps of the reference categorical palette, validated as a
 * set against this app's real chart surface — `--color-surface-card` (rgba(30,41,59,.72))
 * composited over `--color-surface` (#0f172a), i.e. ~#1a2436. Result: lightness band, chroma
 * floor, adjacent-pair CVD separation (worst ΔE 8.4), normal-vision separation (worst ΔE
 * 19.3) and 3:1 contrast all pass. Re-run the validator before changing any hex or the order:
 * the *ordering* is the colorblind-safety mechanism, not decoration.
 *
 * Deliberately NOT derived from --color-accent: the accent is a single petrol cyan used for
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
 * A translucent white rather than `--color-border`: it has to sit a step above the card in both
 * themes, and the border token is nearly invisible against the dark surface, which made a sparse
 * grid look like a handful of stray dots floating in an empty panel.
 */
export const HEAT_EMPTY = 'rgba(148, 163, 184, 0.14)';

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
