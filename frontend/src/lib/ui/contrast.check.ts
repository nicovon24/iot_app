/**
 * Self-check for the theme's colour contrast — run with: npx tsx src/lib/ui/contrast.check.ts
 *
 * This project has swapped its palette wholesale several times (see .paul/STATE.md's
 * "Addendum 2" — four dark variants in one sitting), and each swap was judged by eye.
 * Eyes are bad at this: the accent that shipped for months rendered white button labels
 * at 3.68:1, well under the 4.5:1 WCAG AA asks for. This check reads the real token
 * values out of globals.css and fails the moment a swap drops one below its threshold,
 * so the next palette exploration stays as free as the last one without silently
 * regressing legibility.
 *
 * Thresholds are WCAG 2.1: 4.5:1 for normal text (1.4.3), 3:1 for large text and for
 * the boundary of a UI component or a meaningful icon (1.4.11).
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Rgb = [number, number, number];

const CSS = readFileSync(join(__dirname, '../../app/globals.css'), 'utf8');

/** Pulls a custom property's value out of the `:root` block. */
function token(name: string): string {
  const match = CSS.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm'));
  assert.ok(match, `globals.css should define ${name}`);
  return match[1].trim();
}

function parse(value: string): { rgb: Rgb; alpha: number } {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 };
  }
  const rgba = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/i);
  assert.ok(rgba, `unsupported colour format: ${value}`);
  return {
    rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])],
    alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
  };
}

/** Flattens a translucent colour onto its backdrop — what the eye actually receives. */
function composite(value: string, backdrop: Rgb): Rgb {
  const { rgb, alpha } = parse(value);
  return rgb.map((c, i) => Math.round(c * alpha + backdrop[i] * (1 - alpha))) as Rgb;
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: Rgb = [255, 255, 255];

// The two backdrops every surface in the app ultimately sits on. `.glass-card` is
// translucent, so the card is the composite of --color-surface-card over the page.
const SURFACE = composite(token('--color-surface'), [0, 0, 0]);
const CARD = composite(token('--color-surface-card'), SURFACE);

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

const checks: { label: string; fg: Rgb; bg: Rgb; min: number }[] = [];

/** Ink tokens must clear AA as body text on both the page and a card. */
for (const name of ['--color-heading', '--color-body', '--color-muted', '--color-faint', '--color-accent', '--color-danger']) {
  const ink = composite(token(name), CARD);
  checks.push({ label: `${name} as text on a card`, fg: ink, bg: CARD, min: AA_TEXT });
  checks.push({ label: `${name} as text on the page`, fg: composite(token(name), SURFACE), bg: SURFACE, min: AA_TEXT });
}

/** Solid accent/danger surfaces carry white labels — the button, badge and pill role. */
for (const name of ['--color-accent-strong', '--color-danger-strong', '--gradient-accent-from', '--gradient-accent-to', '--gradient-header-from', '--gradient-header-to', '--gradient-sidebar-active-from', '--gradient-sidebar-active-to']) {
  checks.push({ label: `white text on ${name}`, fg: WHITE, bg: parse(token(name)).rgb, min: AA_TEXT });
}

/** Status gradients back white icons, not text, so 1.4.11's 3:1 applies. */
for (const name of ['--gradient-ok-from', '--gradient-ok-to', '--gradient-danger-from', '--gradient-danger-to', '--gradient-info-from', '--gradient-info-to']) {
  checks.push({ label: `white icon on ${name}`, fg: WHITE, bg: parse(token(name)).rgb, min: AA_NON_TEXT });
}

/** A control the user has to find and click is a UI component, boundary included. */
checks.push({
  label: '--color-border-strong as a control boundary on a card',
  fg: composite(token('--color-border-strong'), CARD),
  bg: CARD,
  min: AA_NON_TEXT,
});

/** The focus ring has to stay visible on every surface it can land on — including the
 * accent-coloured sidebar and header, where it sits on top of the accent, not the page. */
for (const [label, bg] of [
  ['the page', SURFACE],
  ['a card', CARD],
  ['the accent surface', parse(token('--color-accent-strong')).rgb as Rgb],
] as const) {
  checks.push({ label: `--color-focus ring on ${label}`, fg: parse(token('--color-focus')).rgb, bg, min: AA_NON_TEXT });
}

const failures: string[] = [];
for (const { label, fg, bg, min } of checks) {
  const ratio = contrast(fg, bg);
  if (ratio < min) failures.push(`  ${label}: ${ratio.toFixed(2)}:1 (needs ${min}:1)`);
}

assert.strictEqual(
  failures.length,
  0,
  `${failures.length} theme colour pair(s) below their WCAG threshold:\n${failures.join('\n')}`,
);

console.log(`contrast.check.ts: ${checks.length} colour pairs passed`);
