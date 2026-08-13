'use client';

import { GaugeShell } from './GaugeShell';

export type GaugeStyle = 'DIAL' | 'THERMOMETER' | 'RADIAL' | 'BAR';

export interface GaugeWidgetProps {
  label: string;
  value?: number;
  min: number;
  max: number;
  unit?: string;
  ts?: number;
  /** How the same value is drawn. A rendering choice, not a different measurement — see the
   * `style` field on the gauge's config schema. */
  style?: GaugeStyle;
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

export function GaugeWidget({ label, value, min, max, unit, ts, style = 'DIAL' }: GaugeWidgetProps) {
  const hasValue = value !== undefined && Number.isFinite(value);
  // Clamp so an out-of-range reading pins at an end instead of running past the scale, which
  // would read as a smaller value than it is.
  const ratio = hasValue && max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;

  return (
    <GaugeShell label={label} value={value} unit={unit} ts={ts}>
      {style === 'THERMOMETER' ? (
        <Thermometer label={label} value={value} min={min} max={max} ratio={ratio} hasValue={hasValue} />
      ) : style === 'RADIAL' ? (
        <RadialBar label={label} value={value} ratio={ratio} hasValue={hasValue} />
      ) : style === 'BAR' ? (
        <Bar label={label} value={value} min={min} max={max} ratio={ratio} hasValue={hasValue} />
      ) : (
        <Dial label={label} value={value} min={min} max={max} ratio={ratio} hasValue={hasValue} />
      )}
    </GaugeShell>
  );
}

interface StyleProps {
  label: string;
  value?: number;
  min: number;
  max: number;
  ratio: number;
  hasValue: boolean;
}

/** The original 240° instrument dial with a needle. */
function Dial({ label, value, min, max, ratio, hasValue }: StyleProps) {
  const needleAngle = START_ANGLE + SWEEP * ratio;
  const needle = polar(needleAngle, RADIUS - 8);

  return (
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
  );
}

/**
 * A bulb-and-column thermometer.
 *
 * Worth having alongside the dial because a vertical column is the culturally loaded shape for
 * temperature — people read "hot" off it without consulting the scale, which a needle at 2
 * o'clock doesn't give you.
 */
function Thermometer({ label, value, min, max, ratio, hasValue }: StyleProps) {
  const TOP = 8;
  const BOTTOM = 62;
  const height = (BOTTOM - TOP) * ratio;

  return (
    <svg viewBox="0 0 60 84" className="min-h-0 w-full flex-1" role="img" aria-label={`${label}: ${value ?? 'no data'}`}>
      {/* Track and bulb are one continuous cavity, drawn as two shapes with matching fills. */}
      <rect x={24} y={TOP} width={12} height={BOTTOM - TOP} rx={6} fill="var(--color-border)" />
      <circle cx={30} cy={70} r={11} fill="var(--color-border)" />
      {hasValue && (
        <>
          {/* Column grows upward from the bulb, so it's anchored at the bottom. */}
          <rect x={24} y={BOTTOM - height} width={12} height={height} rx={6} fill="var(--color-accent)" />
          <circle cx={30} cy={70} r={9} fill="var(--color-accent)" />
        </>
      )}
      <text x={44} y={TOP + 4} fontSize={6} fill="var(--color-faint)" textAnchor="start">
        {max}
      </text>
      <text x={44} y={BOTTOM} fontSize={6} fill="var(--color-faint)" textAnchor="start">
        {min}
      </text>
    </svg>
  );
}

/**
 * A closed ring that fills clockwise from the top.
 *
 * The compact style: no needle, no scale labels, so it stays legible at tile size where the
 * dial's markings would be unreadable anyway.
 */
function RadialBar({ label, value, ratio, hasValue }: Omit<StyleProps, 'min' | 'max'>) {
  const RING_RADIUS = 34;
  const circumference = 2 * Math.PI * RING_RADIUS;

  return (
    <svg viewBox="0 0 100 84" className="min-h-0 w-full flex-1" role="img" aria-label={`${label}: ${value ?? 'no data'}`}>
      <g transform="rotate(-90 50 42)">
        <circle cx={50} cy={42} r={RING_RADIUS} fill="none" stroke="var(--color-border)" strokeWidth={9} />
        {hasValue && ratio > 0 && (
          <circle
            cx={50}
            cy={42}
            r={RING_RADIUS}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={9}
            strokeLinecap="round"
            // Dash array as a fill fraction: one dash the length of the filled arc, then a gap
            // covering the rest of the circle.
            strokeDasharray={`${circumference * ratio} ${circumference}`}
          />
        )}
      </g>
    </svg>
  );
}

/** A horizontal track that fills left-to-right — the linear counterpart of the other three
 * styles, for progress-style readings (percent complete, tasks done) where a dial's circular
 * sweep reads worse than a straight bar. */
function Bar({ label, value, min, max, ratio, hasValue }: StyleProps) {
  return (
    <svg viewBox="0 0 100 40" className="min-h-0 w-full flex-1" role="img" aria-label={`${label}: ${value ?? 'no data'}`}>
      <rect x={4} y={14} width={92} height={12} rx={6} fill="var(--color-border)" />
      {hasValue && ratio > 0 && <rect x={4} y={14} width={92 * ratio} height={12} rx={6} fill="var(--color-accent)" />}
      <text x={4} y={34} fontSize={6} fill="var(--color-faint)" textAnchor="start">
        {min}
      </text>
      <text x={96} y={34} fontSize={6} fill="var(--color-faint)" textAnchor="end">
        {max}
      </text>
    </svg>
  );
}
