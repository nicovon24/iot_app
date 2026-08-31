'use client';

import type { ReactNode } from 'react';

/**
 * One column of the Admin drill-down, per board 3g.
 *
 * The columns used to be cards floating in a gutter, which made a hierarchy read as a row of
 * unrelated panels. Here they are divisions of one surface: a single hairline on the right,
 * no fill, no radius. The eye follows the rules across rather than hopping between boxes,
 * which is the entire premise of a Miller layout.
 */
export function MillerColumn({
  title,
  action,
  isLast = false,
  children,
}: {
  title: string;
  action?: ReactNode;
  /** The rightmost column drops its divider — there is nothing after it to divide from. */
  isLast?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex h-96 shrink-0 flex-col md:h-full md:min-h-0 md:w-full ${
        isLast ? '' : 'border-r border-border'
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-3 pt-1">
        {/* Archivo rather than the mono label role: this names a level of the hierarchy, and
          * the boards set structural language in the display face. */}
        <h2 className="text-[10px] font-extrabold uppercase leading-none tracking-[0.16em] text-muted">
          {title}
        </h2>
        {action}
      </div>
      <div className="table-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

/**
 * A row in a Miller column. Selection and hover share one treatment — the accent edge —
 * because in a drill-down the selected row *is* the path, and it has to stay legible in
 * every column at once while the pointer moves through the last one.
 */
export function MillerRow({
  label,
  selected = false,
  onSelect,
  meta,
  actions,
}: {
  label: string;
  selected?: boolean;
  onSelect?: () => void;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      data-selected={selected || undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              onSelect();
            }
          : undefined
      }
      className={`ruled-row group flex items-center gap-2 px-4 py-2.5 ${onSelect ? 'cursor-pointer' : ''}`}
    >
      <span className="min-w-0 flex-1 truncate text-[12.5px] leading-none text-nav group-hover:text-heading" title={label}>
        {label}
      </span>
      {meta && <span className="t-label shrink-0">{meta}</span>}
      {actions && (
        <span className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
        </span>
      )}
    </div>
  );
}

/** Shared empty state for a column with nothing at this level. */
export function MillerEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center px-4 text-center">
      <p className="t-body">{label}</p>
    </div>
  );
}
