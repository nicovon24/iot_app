'use client';

import { motion } from 'framer-motion';
import { formatTelemetryValue } from '@/lib';

export interface MultiValueTileEntry {
  id: string;
  name: string;
  value?: string;
  ts?: number;
}

export interface MultiValueTileWidgetProps {
  title: string;
  entries: MultiValueTileEntry[];
  omittedCount?: number;
  isLoading?: boolean;
  /** When set, each tile becomes clickable. Absent = inert tiles. */
  onEntityClick?: (entityId: string) => void;
}

/**
 * One tile per entity for a single telemetry key — the "all entities" form of ValueTileWidget.
 * Deliberately uncolored: these are magnitudes of the same measure, so a categorical palette
 * would imply a distinction that isn't there. Identity comes from the label above each value.
 *
 * The grid is auto-fitting rather than a fixed column count so the same widget reads correctly
 * whether the user sized it 2 columns wide or 12.
 */
export function MultiValueTileWidget({
  title,
  entries,
  omittedCount = 0,
  isLoading,
  onEntityClick,
}: MultiValueTileWidgetProps) {
  return (
    <div className="glass-card flex h-full flex-col gap-2 p-4">
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</span>
        {omittedCount > 0 && (
          <span className="text-xs text-faint">
            {entries.length} of {entries.length + omittedCount}
          </span>
        )}
      </div>

      {isLoading && entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted">No entities to show</p>
        </div>
      ) : (
        <div className="table-scroll grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2 overflow-y-auto">
          {entries.map((entry) => {
            const display = formatTelemetryValue(entry.value);
            return (
              <div
                key={entry.id}
                {...(onEntityClick
                  ? {
                      role: 'button' as const,
                      tabIndex: 0,
                      onClick: () => onEntityClick(entry.id),
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        onEntityClick(entry.id);
                      },
                    }
                  : {})}
                className={`flex flex-col gap-0.5 rounded-md border border-border px-3 py-2 ${
                  onEntityClick ? 'cursor-pointer transition-colors hover:border-accent hover:bg-surface' : ''
                }`}
              >
                <span className="truncate text-xs text-muted" title={entry.name}>
                  {entry.name}
                </span>
                <motion.span
                  key={entry.value}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="text-lg font-semibold text-heading"
                >
                  {display ?? '—'}
                </motion.span>
                <span className="text-[10px] text-faint">
                  {entry.ts ? new Date(entry.ts).toLocaleTimeString() : 'No data'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
