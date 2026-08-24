'use client';

import Link from 'next/link';
import { entityDetailsHref } from '@/components';
import { statusColor, useFleetStatus, type EntityStatus } from './useFleetStatus';
import type { FleetEntityType } from './fleet-positions';

/**
 * The entity dock from board 2a.
 *
 * It reads the same queries the map itself does. That looks like duplicated work and is not:
 * React Query dedupes on queryKey, so the dock, the map and the status overlay share one cache
 * entry per entity rather than each fetching its own.
 *
 * No legend here. It used to carry one at its foot, which put two legends on the same screen —
 * and the two disagreed: this one declared four states and only ever rendered three, with
 * "Reporting" existing purely as a dead entry. The single legend now lives over the map, beside
 * the markers it describes.
 */
export function MapDock({
  scope,
  onScopeChange,
}: {
  scope: FleetEntityType;
  onScopeChange: (scope: FleetEntityType) => void;
}) {
  const { entities, positions, statusById, plotted, isLoading } = useFleetStatus(scope);

  return (
    <aside className="flex w-[392px] shrink-0 flex-col border-l border-border bg-surface-raised">
      <div className="flex shrink-0 items-center gap-4 border-b border-border px-5 py-4">
        {(['DEVICE', 'ASSET'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onScopeChange(s)}
            className={`t-label transition-colors duration-fast ease-out ${
              scope === s ? '!text-accent' : 'hover:!text-heading'
            }`}
          >
            {s === 'DEVICE' ? 'Devices' : 'Assets'}
          </button>
        ))}
        <span className="t-label ml-auto">{isLoading ? 'Locating…' : `${plotted.length} plotted`}</span>
      </div>

      <div className="table-scroll min-h-0 flex-1 overflow-y-auto">
        {entities.length === 0 ? (
          <p className="t-body px-5 py-6">No {scope === 'DEVICE' ? 'devices' : 'assets'} registered.</p>
        ) : (
          entities.map((entity) => {
            const pos = positions[entity.id];
            const status = statusById.get(entity.id);
            return (
              <div key={entity.id} className="ruled-row flex items-center gap-3 px-5 py-3.5">
                {/* Exactly the marker's own two axes — colour for the alarm band, hollow for
                  * unreachable — so a row and its pin are recognisably the same thing. A row
                  * with no position is drawn hollow too: it is absent from the map either way. */}
                <StatusDiamond status={status} plotted={Boolean(pos)} />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="t-item truncate" title={entity.name}>
                    {entity.name}
                  </span>
                  <span className="t-mono">
                    {pos ? `${pos[0].toFixed(4)} · ${pos[1].toFixed(4)}` : 'No position'}
                  </span>
                </span>
                <Link href={entityDetailsHref(entity.id, scope)} className="t-action ml-auto shrink-0">
                  Details
                </Link>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

function StatusDiamond({ status, plotted }: { status: EntityStatus | undefined; plotted: boolean }) {
  const color = statusColor(status);
  const hollow = !plotted || status?.connectivity === 'offline';
  return (
    <span
      aria-hidden
      className="h-[7px] w-[7px] shrink-0 rotate-45"
      style={hollow ? { border: `2px solid ${color}` } : { background: color }}
    />
  );
}
