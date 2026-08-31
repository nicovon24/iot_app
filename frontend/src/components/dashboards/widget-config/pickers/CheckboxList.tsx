'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Checkbox, Input } from '@/components';

export interface CheckboxListItem {
  value: string;
  label: string;
}

/**
 * Multi-select list with select-all/none and optional search. Used for both the entity
 * picker and the telemetry-key picker in BulkAddPanel — same interaction in both places, so
 * "select all" behaves identically whether you're picking 40 devices or 12 keys.
 *
 * Select-all applies to the *filtered* set, which is what makes it useful with search: type
 * "pump", hit select all, get every pump. Selecting all of a filtered subset then clearing
 * the search keeps earlier selections, so you can build a set across several searches.
 */
export function CheckboxList({
  label,
  items,
  selected,
  onChange,
  searchable = false,
  searchPlaceholder = 'Search…',
  emptyLabel = 'Nothing to show',
  maxHeightClassName = 'max-h-56',
}: {
  label: string;
  items: CheckboxListItem[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  maxHeightClassName?: string;
}) {
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    if (!searchable || !search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, search, searchable]);

  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i.value));

  function toggleAll() {
    const next = new Set(selected);
    if (allVisibleSelected) visible.forEach((i) => next.delete(i.value));
    else visible.forEach((i) => next.add(i.value));
    onChange(next);
  }

  function toggleOne(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="t-field">
          {label}
          {selected.size > 0 && <span className="ml-1.5 text-xs font-normal text-muted">({selected.size} selected)</span>}
        </span>
        {visible.length > 0 && (
          <button type="button" onClick={toggleAll} className="text-xs font-medium text-accent hover:underline">
            {allVisibleSelected ? 'Select none' : 'Select all'}
          </button>
        )}
      </div>

      {searchable && (
        <Input
          icon={<Search size={14} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          compact
        />
      )}

      <div className={`table-scroll flex ${maxHeightClassName} flex-col gap-1 overflow-y-auto rounded-md border border-border p-2`}>
        {visible.length === 0 && <span className="px-1.5 py-1 text-sm text-muted">{emptyLabel}</span>}
        {visible.map((item) => (
          <label
            key={item.value}
            className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm text-body hover:bg-tint"
          >
            <Checkbox checked={selected.has(item.value)} onChange={() => toggleOne(item.value)} />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
}
