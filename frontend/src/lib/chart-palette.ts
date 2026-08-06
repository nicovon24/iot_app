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
