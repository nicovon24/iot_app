'use client';

import { formatMaybeTimestamp, formatTelemetryValue } from '@\/lib';
import type { CellValue, ResolvedColumn } from '@/components';

export interface EntityDataTableRow {
  id: string;
  name: string;
}

export interface EntityDataTableWidgetProps {
  rows: EntityDataTableRow[];
  columns: ResolvedColumn[];
  values: Record<string, Record<string, CellValue>>;
  /**
   * 'LIST' puts one configured key per row — right for a single entity, which usually has more
   * keys than a widget is wide. 'MATRIX' transposes to one entity per row with keys as columns,
   * the only layout that works once there are many entities.
   */
  mode: 'LIST' | 'MATRIX';
  omittedCount?: number;
  isLoading?: boolean;
  title?: string;
  /** When set, MATRIX rows become clickable. Absent = inert rows, exactly as before. */
  onEntityClick?: (entityId: string) => void;
}

const SOURCE_LABEL: Record<ResolvedColumn['source'], string> = {
  ATTRIBUTE: 'Attribute',
  TELEMETRY: 'Telemetry',
};

const SCOPE_SHORT: Record<string, string> = {
  CLIENT_SCOPE: 'client',
  SERVER_SCOPE: 'server',
  SHARED_SCOPE: 'shared',
};

function Shell({ children, note, title }: { children: React.ReactNode; note?: string; title?: string }) {
  return (
    <div className="glass-card flex h-full flex-col p-0">
      {title && (
        <h3 className="shrink-0 truncate border-b border-border px-4 py-3 text-sm font-semibold text-heading">
          {title}
        </h3>
      )}
      {note && <p className="shrink-0 border-b border-border px-4 py-2 text-xs text-faint">{note}</p>}
      <div className="table-scroll min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

function Centered({ text }: { text: string }) {
  return (
    <div className="glass-card flex h-full items-center justify-center">
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

function formatCell(column: ResolvedColumn, cell: CellValue | undefined) {
  if (!cell || cell.value === undefined) return null;
  // Epoch timestamps (lastActivityTime and friends) are unreadable as raw numbers and carry no
  // type marker, so they're detected by value range before anything else.
  const asDate = formatMaybeTimestamp(cell.value);
  if (asDate) return asDate;
  // Telemetry is numeric-ish and gets the shared rounding/unit treatment; an attribute can be
  // any JSON scalar, so it's shown verbatim.
  return column.source === 'TELEMETRY' ? (formatTelemetryValue(cell.value) ?? cell.value) : cell.value;
}

export function EntityDataTableWidget({
  rows,
  columns,
  values,
  mode,
  omittedCount = 0,
  isLoading,
  title,
  onEntityClick,
}: EntityDataTableWidgetProps) {
  if (isLoading && rows.length === 0) return <Centered text="Loading…" />;
  if (rows.length === 0) return <Centered text="No entities to show" />;
  // Kept audience-neutral rather than "pick columns in the Columns tab": this renders for
  // read-only dashboard viewers too, who have no edit panel to act on that instruction.
  if (columns.length === 0) return <Centered text="No columns configured for this table" />;

  const note = omittedCount > 0 ? `Showing ${rows.length} of ${rows.length + omittedCount} entities` : undefined;

  if (mode === 'LIST') {
    const entityId = rows[0].id;
    return (
      <Shell note={note} title={title}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <Th sticky>Key</Th>
              <Th>Source</Th>
              <Th>Value</Th>
              <Th>Updated</Th>
            </tr>
          </thead>
          <tbody>
            {columns.map((column) => {
              const cell = values[entityId]?.[column.id];
              const display = formatCell(column, cell);
              return (
                <tr key={column.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2 font-medium text-heading">{column.label}</td>
                  <td className="px-3 py-2 text-muted">
                    {SOURCE_LABEL[column.source]}
                    {column.scope ? ` · ${SCOPE_SHORT[column.scope]}` : ''}
                  </td>
                  <td className="px-3 py-2 text-body">{display ?? <span className="text-faint">—</span>}</td>
                  <td className="px-3 py-2 text-faint">
                    {cell?.ts ? new Date(cell.ts).toLocaleString() : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Shell>
    );
  }

  return (
    <Shell note={note} title={title}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <Th sticky>Entity</Th>
            {columns.map((column) => (
              <Th key={column.id} title={`${SOURCE_LABEL[column.source]}${column.scope ? ` · ${SCOPE_SHORT[column.scope]}` : ''}`}>
                {column.label}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              // Only advertise interactivity when there's an action behind it — an inert row
              // that looks clickable is worse than one that plainly isn't.
              {...(onEntityClick
                ? {
                    role: 'button' as const,
                    tabIndex: 0,
                    onClick: () => onEntityClick(row.id),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return;
                      e.preventDefault();
                      onEntityClick(row.id);
                    },
                  }
                : {})}
              className={`border-b border-border last:border-b-0 ${
                onEntityClick ? 'cursor-pointer transition-colors hover:bg-surface' : ''
              }`}
            >
              <td className="sticky left-0 z-10 bg-surface px-3 py-2 font-medium text-heading">{row.name}</td>
              {columns.map((column) => {
                const display = formatCell(column, values[row.id]?.[column.id]);
                return (
                  <td key={column.id} className="px-3 py-2 text-body">
                    {display ?? <span className="text-faint">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}

function Th({ children, sticky, title }: { children: React.ReactNode; sticky?: boolean; title?: string }) {
  return (
    <th
      title={title}
      className={`sticky top-0 border-b border-border bg-surface px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted ${
        sticky ? 'left-0 z-20' : 'z-10'
      }`}
    >
      {children}
    </th>
  );
}
