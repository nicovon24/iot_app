import type { CatalogUnit } from '@/types';

export type { CatalogUnit } from '@/types';

/**
 * Static unit reference data — no factor/offset/baseUnit fields. Those would only matter for a
 * conversion feature, which is explicitly out of scope for this phase (see
 * .paul/phases/12-units-and-widgets/CONTEXT.md, "Pendiente para más adelante"); adding ~30
 * conversion constants nobody exercises yet would just be untested numbers.
 *
 * Known trap for whenever conversion IS added: SUM/COUNT aggregations don't compose under an
 * offset-based unit conversion (°C→°F), since offsetting each sample before summing is not the
 * same as offsetting the sum. Not a concern here — nothing in this module converts a value.
 */
export const UNIT_CATEGORIES: Record<string, { label: string; units: CatalogUnit[] }> = {
  temperature: {
    label: 'Temperature',
    units: [
      { symbol: '°C', label: 'Celsius', decimals: 1 },
      { symbol: '°F', label: 'Fahrenheit', decimals: 1 },
    ],
  },
  percentage: {
    label: 'Percentage',
    units: [{ symbol: '%', label: 'Percent', decimals: 0 }],
  },
  signal: {
    label: 'Signal',
    units: [{ symbol: 'dBm', label: 'Decibel-milliwatts', decimals: 0 }],
  },
  pressure: {
    label: 'Pressure',
    units: [
      { symbol: 'bar', label: 'Bar', decimals: 2 },
      { symbol: 'psi', label: 'Pounds per square inch', decimals: 2 },
      { symbol: 'Pa', label: 'Pascal', decimals: 0 },
    ],
  },
  energy: {
    label: 'Energy',
    units: [
      { symbol: 'kWh', label: 'Kilowatt-hour', decimals: 2 },
      { symbol: 'J', label: 'Joule', decimals: 0 },
    ],
  },
  power: {
    label: 'Power',
    units: [
      { symbol: 'W', label: 'Watt', decimals: 1 },
      { symbol: 'kW', label: 'Kilowatt', decimals: 2 },
    ],
  },
  flow: {
    label: 'Flow',
    units: [
      { symbol: 'L/min', label: 'Litres per minute', decimals: 1 },
      { symbol: 'm³/h', label: 'Cubic metres per hour', decimals: 1 },
    ],
  },
  volume: {
    label: 'Volume',
    units: [
      { symbol: 'L', label: 'Litre', decimals: 1 },
      { symbol: 'm³', label: 'Cubic metre', decimals: 2 },
    ],
  },
  length: {
    label: 'Length',
    units: [
      { symbol: 'm', label: 'Metre', decimals: 1 },
      { symbol: 'cm', label: 'Centimetre', decimals: 0 },
      { symbol: 'mm', label: 'Millimetre', decimals: 0 },
      { symbol: 'km', label: 'Kilometre', decimals: 2 },
    ],
  },
  mass: {
    label: 'Mass',
    units: [
      { symbol: 'kg', label: 'Kilogram', decimals: 1 },
      { symbol: 'g', label: 'Gram', decimals: 0 },
      { symbol: 't', label: 'Tonne', decimals: 2 },
    ],
  },
  speed: {
    label: 'Speed',
    units: [
      { symbol: 'km/h', label: 'Kilometres per hour', decimals: 1 },
      { symbol: 'm/s', label: 'Metres per second', decimals: 1 },
    ],
  },
  duration: {
    label: 'Duration',
    units: [
      { symbol: 's', label: 'Seconds', decimals: 0 },
      { symbol: 'min', label: 'Minutes', decimals: 0 },
      { symbol: 'h', label: 'Hours', decimals: 1 },
    ],
  },
  count: {
    label: 'Count',
    units: [{ symbol: 'count', label: 'Count', decimals: 0 }],
  },
};

/** Flattened symbol → unit lookup, built once at module load — this is consulted on every
 * render of every value-carrying widget, so it must not re-flatten UNIT_CATEGORIES per call. */
const UNIT_BY_SYMBOL: Record<string, CatalogUnit> = Object.fromEntries(
  Object.values(UNIT_CATEGORIES).flatMap((category) => category.units.map((u) => [u.symbol, u])),
);

/**
 * Stored value → what to render. Unknown strings pass through as a literal suffix — saved
 * dashboards already contain free-text units ('%', 'dBm', '°C') from before this catalog
 * existed, and must never break or drop them.
 */
export function resolveUnit(stored?: string): { symbol: string; decimals?: number } | undefined {
  if (!stored) return undefined;
  const known = UNIT_BY_SYMBOL[stored];
  return known ? { symbol: stored, decimals: known.decimals } : { symbol: stored, decimals: undefined };
}

/** telemetryKey → suggested unit, by case-insensitive substring match. Generalises the two
 * hardcoded lookup tables (DIAL_DEFAULTS, SCALE_PLACEHOLDERS) that predate this catalog. */
const SUGGESTIONS: Array<[substring: string, unit: string]> = [
  ['temp', '°C'],
  ['humid', '%'],
  ['batt', '%'],
  ['rssi', 'dBm'],
  ['signal', 'dBm'],
  ['pressure', 'bar'],
  ['flow', 'L/min'],
  ['power', 'W'],
  ['energy', 'kWh'],
  ['speed', 'km/h'],
  ['velocity', 'km/h'],
];

export function suggestUnit(telemetryKey: string): string | undefined {
  const lower = telemetryKey.toLowerCase();
  const match = SUGGESTIONS.find(([substring]) => lower.includes(substring));
  return match?.[1];
}
