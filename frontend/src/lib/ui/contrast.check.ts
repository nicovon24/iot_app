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
 * The aqua-green palette inverted one of the invariants this file used to hold. While the
 * accent was a dark petrol cyan, every accent surface carried white; at #2ee89a white
 * measures 1.60:1, so accent surfaces now carry --color-on-accent and it is that pairing
 * which is asserted. The same split runs through the status gradients, which no longer
 * agree with each other — ok/info are light, danger is dark — so each declares its own ink.
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
function token(name: string, seen: string[] = []): string {
  // The @theme inline block re-declares most tokens as `--x: var(--x)`. Alias-following
  // only avoids those because :root is matched first, and that holds solely for tokens
  // declared in both places — --font-sans and --font-mono, for instance, exist only in
  // @theme and point straight at themselves. Without this guard, asking for one recurses
  // until the stack dies instead of saying what is wrong.
  assert.ok(!seen.includes(name), `circular token alias: ${[...seen, name].join(' -> ')}`);
  const match = CSS.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm'));
  assert.ok(match, `globals.css should define ${name}`);
  const value = match[1].trim();
  // Several tokens alias another token rather than repeating its literal — follow the
  // indirection so the checker measures the colour that actually paints.
  const alias = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  return alias ? token(alias[1], [...seen, name]) : value;
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

/** Accent surfaces — the button, badge and active-pill role — carry dark ink, not white.
 * Asserting the pair is the point: the bug this replaces was a background that moved to a
 * brighter green while the `text-white` on top of it stayed put. */
const ON_ACCENT = parse(token('--color-on-accent')).rgb;
for (const name of ['--color-accent-strong', '--gradient-accent-from', '--gradient-accent-to', '--gradient-sidebar-active-from', '--gradient-sidebar-active-to']) {
  checks.push({ label: `--color-on-accent text on ${name}`, fg: ON_ACCENT, bg: parse(token(name)).rgb, min: AA_TEXT });
}

/** Danger stayed a dark surface, so it kept its white label. */
checks.push({ label: 'white text on --color-danger-strong', fg: WHITE, bg: parse(token('--color-danger-strong')).rgb, min: AA_TEXT });

/** The impersonation banner is the app's one warning surface. */
checks.push({ label: '--color-on-warning text on --color-warning', fg: parse(token('--color-on-warning')).rgb, bg: parse(token('--color-warning')).rgb, min: AA_TEXT });

/** Status gradients back icons, not text, so 1.4.11's 3:1 applies — but each against its
 * own declared ink, since ok/info are light surfaces and danger is a dark one. Anything
 * that reads these by interpolation (CountTileWidget) depends on them agreeing. */
for (const family of ['ok', 'danger', 'info']) {
  const ink = parse(token(`--gradient-${family}-ink`)).rgb;
  for (const stop of ['from', 'to']) {
    checks.push({
      label: `--gradient-${family}-ink icon on --gradient-${family}-${stop}`,
      fg: ink,
      bg: parse(token(`--gradient-${family}-${stop}`)).rgb,
      min: AA_NON_TEXT,
    });
  }
}

/** A control the user has to find and click is a UI component, boundary included. */
checks.push({
  label: '--color-border-strong as a control boundary on a card',
  fg: composite(token('--color-border-strong'), CARD),
  bg: CARD,
  min: AA_NON_TEXT,
});

/** The focus ring has to stay visible on every surface it can land on. */
for (const [label, bg] of [
  ['the page', SURFACE],
  ['a card', CARD],
] as const) {
  checks.push({ label: `--color-focus ring on ${label}`, fg: parse(token('--color-focus')).rgb, bg, min: AA_NON_TEXT });
}

/** No single ring colour clears 3:1 against both a near-black page and a bright accent:
 * the pale mint ring measures 1.18:1 on the accent, and white is no better at 1.60:1. A
 * control whose own background is the accent flips to a dark ring instead — the
 * .btn-accent / .badge-accent focus rules in globals.css are what apply it. */
checks.push({
  label: '--color-focus-on-accent ring on the accent surface',
  fg: parse(token('--color-focus-on-accent')).rgb,
  bg: parse(token('--color-accent-strong')).rgb,
  min: AA_NON_TEXT,
});

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
