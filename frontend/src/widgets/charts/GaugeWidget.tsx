'use client';

import { formatTelemetryValue } from '@/lib/format';

export interface GaugeWidgetProps {
  label: string;
  value?: number;
  min: number;
  max: number;
  unit?: string;
  ts?: number;
}

/**
 * Radial gauge drawn as inline SVG rather than pulled from a chart library: it's a single arc
 * plus a needle, and Recharts' RadialBarChart would need fake series data and still not give a
 * needle or an open-bottom sweep.
 *
 * The dial is a 240° arc opening at the bottom — the conventional instrument look, and it
 * leaves room under the needle for the readout.
 */
const START_ANGLE = 150; // degrees, measured clockwise from the positive x-axis
const SWEEP = 240;
const RADIUS = 42;
const CENTER = 50;

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function arcPath(fromDeg: number, toDeg: number, radius: number) {
  const start = polar(fromDeg, radius);
  const end = polar(toDeg, radius);
  const largeArc = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function GaugeWidget({ label, value, min, max, unit, ts }: GaugeWidgetProps) {
  const hasValue = value !== undefined && Number.isFinite(value);
  // Clamp so an out-of-range reading pins the needle at an end instead of spinning past the
  // dial, which would read as a smaller value than it is.
  const ratio = hasValue && max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const needleAngle = START_ANGLE + SWEEP * ratio;
  const needle = polar(needleAngle, RADIUS - 8);

  return (
    <div className="glass-card flex h-full flex-col items-center justify-center gap-1 p-4">
      <span className="w-full truncate text-center text-xs font-semibold uppercase tracking-wider text-muted" title={label}>
        {label}
      </span>

      <svg viewBox="0 0 100 78" className="min-h-0 w-full flex-1" role="img" aria-label={`${label}: ${value ?? 'no data'}`}>
        <path
          d={arcPath(START_ANGLE, START_ANGLE + SWEEP, RADIUS)}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {hasValue && ratio > 0 && (
          <path
            d={arcPath(START_ANGLE, needleAngle, RADIUS)}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={8}
            strokeLinecap="round"
          />
        )}
        {hasValue && (
          <>
            <line
              x1={CENTER}
              y1={CENTER}
              x2={needle.x}
              y2={needle.y}
              stroke="var(--color-heading)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <circle cx={CENTER} cy={CENTER} r={3} fill="var(--color-heading)" />
          </>
        )}
        <text x={polar(START_ANGLE, RADIUS).x} y={CENTER + RADIUS / 1.6} fontSize={6} fill="var(--color-faint)" textAnchor="middle">
          {min}
        </text>
        <text
          x={polar(START_ANGLE + SWEEP, RADIUS).x}
          y={CENTER + RADIUS / 1.6}
          fontSize={6}
          fill="var(--color-faint)"
          textAnchor="middle"
        >
          {max}
        </text>
      </svg>

      <div className="flex shrink-0 flex-col items-center">
        <span className="text-2xl font-semibold text-heading">
          {hasValue ? (formatTelemetryValue(String(value)) ?? value) : '—'}
          {hasValue && unit ? <span className="ml-1 text-base font-normal text-body">{unit}</span> : null}
        </span>
        <span className="text-xs text-faint">{ts ? new Date(ts).toLocaleTimeString() : 'Waiting for data…'}</span>
      </div>
    </div>
  );
}
