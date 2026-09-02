/** The unit catalog. */
import { describe, expect, it } from 'vitest';
import { UNIT_CATEGORIES, resolveUnit, suggestUnit } from './units';

describe('UNIT_CATEGORIES', () => {
  it('has unique symbols across every category', () => {
    // A collision would silently break the unit picker (Phase 12-02).
    const allSymbols = Object.values(UNIT_CATEGORIES).flatMap((c) => c.units.map((u) => u.symbol));
    expect(new Set(allSymbols).size).toBe(allSymbols.length);
  });
});

describe('resolveUnit', () => {
  it('resolves a known unit to its catalog entry', () => {
    const celsius = resolveUnit('°C');
    expect(celsius).toBeTruthy();
    expect(celsius?.symbol).toBe('°C');
    expect(celsius?.decimals).toBe(1);
  });

  it('passes an unknown unit through as a literal, never dropping or throwing', () => {
    expect(resolveUnit('widgets/hr')).toEqual({ symbol: 'widgets/hr', decimals: undefined });
  });

  it('resolves undefined/empty to undefined', () => {
    expect(resolveUnit(undefined)).toBeUndefined();
    expect(resolveUnit('')).toBeUndefined();
  });
});

describe('suggestUnit', () => {
  it('suggests a unit from a recognizable key name', () => {
    expect(suggestUnit('batteryLevel')).toBe('%');
    expect(suggestUnit('outsideTemperature')).toBe('°F');
  });

  it('returns undefined for an unrecognized key', () => {
    expect(suggestUnit('unknownKey123')).toBeUndefined();
  });
});
