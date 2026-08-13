/**
 * Self-check for the unit catalog — run with: npx tsx src/lib/format/units.check.ts
 */
import assert from 'node:assert';
import { UNIT_CATEGORIES, resolveUnit, suggestUnit } from './units';

// Every symbol across every category must be unique, or the picker (12-02) silently collides.
const allSymbols = Object.values(UNIT_CATEGORIES).flatMap((c) => c.units.map((u) => u.symbol));
assert.strictEqual(allSymbols.length, new Set(allSymbols).size, 'catalog symbols must be unique');

// Known units resolve to a catalog entry.
const celsius = resolveUnit('°C');
assert.ok(celsius, '°C should resolve');
assert.strictEqual(celsius?.symbol, '°C');
assert.strictEqual(celsius?.decimals, 1);

// Unknown (free-text, back-compat) units pass through as a literal, never dropped or thrown.
const custom = resolveUnit('widgets/hr');
assert.deepStrictEqual(custom, { symbol: 'widgets/hr', decimals: undefined });

// Undefined/empty resolve to undefined.
assert.strictEqual(resolveUnit(undefined), undefined);
assert.strictEqual(resolveUnit(''), undefined);

// Key-name suggestions.
assert.strictEqual(suggestUnit('batteryLevel'), '%');
assert.strictEqual(suggestUnit('outsideTemperature'), '°C');
assert.strictEqual(suggestUnit('unknownKey123'), undefined);

console.log('units.ts checks passed');
