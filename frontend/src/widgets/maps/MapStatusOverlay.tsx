'use client';

import { Cpu, TriangleAlert, type LucideIcon } from 'lucide-react';
import { LEVEL_COLORS } from '@/lib';
import { useFleetStatus } from './useFleetStatus';
import type { FleetEntityType } from './fleet-positions';

/**
 * The panel chrome shared by both overlays: a near-opaque ground with a blur behind it.
 *
 * This is one of only two places in the app that still blurs — a panel laid over live map
 * tiles has to separate itself from whatever happens to be under it, and a flat fill at this
 * opacity would either hide the map or lose its own edge. Everywhere else the hairline alone
 * does the job, because everywhere else the ground is a known colour.
 */
const PANEL =
  'border border-rule bg-[rgba(5,9,7,.86)] px-[18px] py-3.5 backdrop-blur-[10px]';

function Stat({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: 'default' | 'alert';
}) {
  // A zero is an absence, not a quantity, so it steps back rather than shouting the same 36px
  // in full white. --color-muted rather than the dimmer --color-inactive the rest of the app
  // uses for this: unlike every other surface, this panel is translucent over map tiles, and
  // on the light Streets basemap it composites to #262927 where --color-inactive measures
  // 2.33:1 — under even the 3:1 large-text threshold. Muted holds 5.2:1 on that same ground.
  const lit = value > 0;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon
          size={13}
          strokeWidth={1.75}
          className={tone === 'alert' && lit ? 'text-danger' : tone === 'alert' ? 'text-muted' : 'text-accent'}
        />
        <span className="t-label !tracking-[0.18em] !text-muted">{label}</span>
      </div>
      <div
        className={`text-4xl font-extrabold leading-none tracking-[-0.03em] tabular-nums ${
          lit ? (tone === 'alert' ? 'text-danger' : 'text-heading') : 'text-muted'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/** One legend entry. `color` paints the swatch; `hollow` mirrors the marker's offline form. */
function LegendRow({ label, color, hollow = false }: { label: string; color: string; hollow?: boolean }) {
  return (
    <span className="flex items-center gap-[9px]">
      <span
        aria-hidden
        className="h-2 w-2 rotate-45"
        style={hollow ? { border: `2px solid ${color}` } : { background: color }}
      />
      {/* Always --color-muted, never the swatch's own colour: this panel is translucent over
        * map tiles, and an amber label on the light Streets basemap falls under 4.5:1. The
        * swatch carries the colour, the label only has to be readable. */}
      <span className="font-mono text-[10px] leading-none tracking-[0.1em] text-muted">{label}</span>
    </span>
  );
}

/**
 * The status overlay in the map's bottom-left corner (board 2a).
 *
 * It answers the two questions the map itself cannot: how many of the fleet actually made it
 * onto the canvas, and how many are in trouble. A device with no position is invisible on a
 * map by definition, so without this the screen quietly under-reports the fleet — five pins
 * look like five devices whether there are five or fifty.
 */
export function MapStatusOverlay({ scope }: { scope: FleetEntityType }) {
  const { entities, plotted, statusById, alarmedIds, isLoading } = useFleetStatus(scope);

  const inAlarm = alarmedIds.length;
  const offline = entities.filter((e) => statusById.get(e.id)?.connectivity === 'offline').length;

  if (isLoading) return null;

  return (
    <div className="pointer-events-none absolute bottom-6 left-6 z-[1000] flex items-end gap-3.5">
      <div className={`relative flex gap-[34px] ${PANEL}`}>
        {/* Two corner brackets rather than four: an instrument's registration marks, and the
          * one flourish the system allows itself. Offset by 1px so they sit on the border
          * rather than inside it. */}
        <span
          aria-hidden
          className="absolute -left-px -top-px h-[9px] w-[9px] border-l-2 border-t-2 border-accent"
        />
        <span
          aria-hidden
          className="absolute -bottom-px -right-px h-[9px] w-[9px] border-b-2 border-r-2 border-accent"
        />

        <Stat icon={Cpu} label="Plotted" value={plotted.length} />
        <div aria-hidden className="w-px bg-border" />
        <Stat icon={TriangleAlert} label="In alarm" value={inAlarm} tone="alert" />
      </div>

      <div className={`flex flex-col gap-2.5 ${PANEL}`}>
        <span className="t-label !tracking-[0.18em] !text-muted">Legend</span>
        <LegendRow label="Online" color="var(--color-accent)" />
        <LegendRow label="Critical" color={LEVEL_COLORS.critical} />
        <LegendRow label="Warning" color={LEVEL_COLORS.warning} />
        <LegendRow label="Indeterminate" color={LEVEL_COLORS.indeterminate} />
        {/* Hollow, and in the neutral: offline is the other axis of the mark, not a fifth
          * severity. Counted only when something is actually in that state — a legend line for
          * an empty state is one the reader has to rule out. */}
        <LegendRow
          label={offline > 0 ? `Offline (${offline})` : 'Offline'}
          color="var(--color-muted)"
          hollow
        />
      </div>
    </div>
  );
}
