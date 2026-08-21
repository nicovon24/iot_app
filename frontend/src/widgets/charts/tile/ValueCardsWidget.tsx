'use client';

import { motion } from 'framer-motion';
import { formatTelemetryValue } from '@/lib';

export interface ValueCardMeasure {
  key: string;
  value?: string;
  ts?: number;
}

export interface ValueCardEntry {
  id: string;
  name: string;
  measures: ValueCardMeasure[];
}

export interface ValueCardsWidgetProps {
  entries: ValueCardEntry[];
  omittedCount?: number;
  isLoading?: boolean;
  title?: string;
  /** When set, each card becomes clickable. Absent = inert cards. */
  onEntityClick?: (entityId: string) => void;
  /** Per-key unit — unlike the single `unit` other widgets take, each measure can have its own. */
  units?: Record<string, string>;
}

/**
 * A card per entity, each listing the same set of measures — "temperature and pressure for
 * every pump", read side by side.
 *
 * Grouped by entity rather than by measure because the entity is the thing you're monitoring:
 * one card answers "how is pump-003 doing?" at a glance. Grouping the other way (a card per
 * measure listing every entity) makes cross-entity comparison of a single metric easier, but
 * that's what the Value Tile grid already does.
 *
 * No categorical colors here: every card shows the same measures, so hue would encode nothing.
 */
export function ValueCardsWidget({
  entries,
  omittedCount = 0,
  isLoading,
  title,
  onEntityClick,
  units,
}: ValueCardsWidgetProps) {
  if (isLoading && entries.length === 0) {
    return (
      <div className="glass-card flex h-full items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="glass-card flex h-full items-center justify-center">
        <p className="text-sm text-muted">No entities to show</p>
      </div>
    );
  }

  return (
    <div className="glass-card flex h-full flex-col gap-2 p-4">
      {title && <h3 className="shrink-0 truncate text-sm font-semibold text-heading">{title}</h3>}
      {omittedCount > 0 && (
        <span className="shrink-0 text-xs text-faint">
          Showing {entries.length} of {entries.length + omittedCount} entities
        </span>
      )}

      <div className="table-scroll grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 overflow-y-auto">
        {entries.map((entry) => (
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
            className={`flex flex-col gap-2 rounded-lg border border-border p-3 ${
              onEntityClick ? 'cursor-pointer transition-colors hover:border-accent hover:bg-surface' : ''
            }`}
          >
            <span className="truncate text-xs font-semibold text-heading" title={entry.name}>
              {entry.name}
            </span>
            <div className="flex flex-col gap-1.5">
              {entry.measures.map((measure) => {
                const display = formatTelemetryValue(measure.value, { unit: units?.[measure.key] });
                return (
                  <div key={measure.key} className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted">{measure.key}</span>
                    <motion.span
                      key={measure.value}
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      className="text-lg font-semibold leading-tight text-heading"
                    >
                      {display ?? '—'}
                    </motion.span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
