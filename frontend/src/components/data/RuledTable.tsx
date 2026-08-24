'use client';

import type { ReactNode } from 'react';
import { Skeleton } from '../feedback';

export interface RuledColumn<T> {
  /** React key and nothing else — headers are the visible label. */
  key: string;
  /** Rendered as a mono, letter-spaced, uppercase column head. Empty for the action column. */
  header?: string;
  /** A CSS grid track: '1fr', '108px', … Straight from the board's grid-template-columns. */
  width: string;
  render: (row: T) => ReactNode;
  /** Right-align the cell — used for the trailing action column. */
  align?: 'left' | 'right';
}

export interface RuledTableProps<T> {
  columns: RuledColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  emptyLabel: string;
  onRowClick?: (row: T) => void;
  /** Total across all pages, when the list is a page of a larger set. Drives the footer. */
  total?: number;
  /** Marks a row as the current selection — same treatment as hover, but sticky. */
  isSelected?: (row: T) => boolean;
}

/**
 * The ruled table the Editorial boards use on every list screen.
 *
 * Not a <table>: the boards align five screens on a shared column rhythm, and CSS grid holds
 * a track list far more legibly than colgroup does — each screen passes its own
 * grid-template-columns straight from its board.
 *
 * Rows bleed past the page gutter (-mx-10 with matching padding) so the hairline between
 * them runs the full width of the viewport. That edge-to-edge rule is the whole reason the
 * design reads as a ruled document rather than as a card with a list inside it, and it is
 * why this component replaced the HeroUI <Table> rather than restyling it — HeroUI wraps
 * its rows in a bordered, radiused container that cannot bleed.
 */
export function RuledTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  isError,
  error,
  emptyLabel,
  onRowClick,
  total,
  isSelected,
}: RuledTableProps<T>) {
  const template = columns.map((c) => c.width).join(' ');

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <RuledHeader columns={columns} template={template} />
        <div className="flex flex-col">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="-mx-10 border-b border-border px-10 py-[15px]">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center py-16">
        <p className="text-sm text-danger">
          Failed to load: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <RuledHeader columns={columns} template={template} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="badge-quiet flex h-11 w-11 items-center justify-center">
            <span aria-hidden className="h-2 w-2 rotate-45 bg-faint" />
          </span>
          <p className="t-body">{emptyLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-scroll flex h-full flex-col overflow-y-auto">
      <RuledHeader columns={columns} template={template} />

      <div className="flex flex-col">
        {rows.map((row) => {
          const selected = isSelected?.(row) ?? false;
          const interactive = Boolean(onRowClick);
          return (
            <div
              key={rowKey(row)}
              data-selected={selected || undefined}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              onClick={interactive ? () => onRowClick?.(row) : undefined}
              onKeyDown={
                interactive
                  ? (e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      onRowClick?.(row);
                    }
                  : undefined
              }
              className={`ruled-row group -mx-10 grid items-center gap-[18px] px-10 py-[15px] ${
                interactive ? 'cursor-pointer' : ''
              }`}
              style={{ gridTemplateColumns: template }}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={`min-w-0 ${col.align === 'right' ? 'flex items-center justify-end' : ''}`}
                >
                  {col.render(row)}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* The count, stated rather than paginated. The list endpoints return everything the
        * screen shows, so a pager would be a control with nothing behind it — what the
        * board actually communicates here is "this is all of them". */}
      {total !== undefined && rows.length > 0 && (
        <div className="t-label -mx-10 mt-auto px-10 pb-1 pt-4">
          1–{rows.length} of {total}
        </div>
      )}
    </div>
  );
}

function RuledHeader<T>({ columns, template }: { columns: RuledColumn<T>[]; template: string }) {
  return (
    <div
      className="-mx-10 grid shrink-0 items-center gap-[18px] border-b border-border px-10 py-[13px]"
      style={{ gridTemplateColumns: template }}
    >
      {columns.map((col) => (
        <span key={col.key} className={`t-label truncate ${col.align === 'right' ? 'text-right' : ''}`}>
          {col.header ?? ''}
        </span>
      ))}
    </div>
  );
}

/**
 * The name cell, shared by every list: a diamond carrying status, then the name itself.
 * The diamond is the app's status vocabulary — a circle here would be the only curve on
 * the screen.
 */
export function RuledName({ name, ok = true, title }: { name: string; ok?: boolean; title?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-[11px]">
      <span
        aria-hidden
        className={`h-[7px] w-[7px] shrink-0 rotate-45 ${ok ? 'bg-accent' : 'bg-danger'}`}
      />
      <span className="t-item truncate" title={title ?? name}>
        {name}
      </span>
    </span>
  );
}

/** An empty cell. An em dash rather than blank, so the column still reads as a column. */
export function RuledEmpty() {
  return <span className="text-[12px] text-faint">—</span>;
}
