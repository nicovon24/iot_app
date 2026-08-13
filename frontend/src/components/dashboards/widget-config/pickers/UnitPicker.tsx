'use client';

import { useState } from 'react';
import { Select, type SelectOption } from '@/components';
import { Input } from '@/components';
import { UNIT_CATEGORIES, resolveUnit } from '@\/lib';

const CUSTOM_VALUE = '__custom__';

const CATALOG_OPTIONS: SelectOption[] = Object.values(UNIT_CATEGORIES).flatMap((category) =>
  category.units.map((unit) => ({
    value: unit.symbol,
    label: `${unit.label} (${unit.symbol})`,
    group: category.label,
  })),
);
const OPTIONS: SelectOption[] = [...CATALOG_OPTIONS, { value: CUSTOM_VALUE, label: 'Custom…' }];

const isCatalogSymbol = (v: string) => CATALOG_OPTIONS.some((o) => o.value === v);

export interface UnitPickerProps {
  value: string;
  onChange: (v: string) => void;
  decimals?: string;
  onDecimalsChange?: (v: string) => void;
  /** Scatter's axis units have no per-axis decimals control today — omit rather than adding one
   * only there. */
  showDecimals?: boolean;
}

/**
 * Catalog-backed unit picker with a free-text "Custom…" escape hatch — this IS the back-compat
 * path: a stored value not in the catalog (a saved dashboard's old free-text unit) opens in
 * Custom mode showing that exact text, never blank, never an error.
 */
export function UnitPicker({ value, onChange, decimals, onDecimalsChange, showDecimals = true }: UnitPickerProps) {
  // Once the user explicitly picks "Custom…", stay in custom mode even if what they type happens
  // to match a catalog symbol mid-edit — otherwise the input would yank itself back to the
  // dropdown while they're typing.
  const [forcedCustom, setForcedCustom] = useState(false);
  const isCustom = forcedCustom || (Boolean(value) && !isCatalogSymbol(value));

  if (isCustom) {
    return (
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Unit"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={24}
            placeholder="e.g. widgets/hr"
          />
        </div>
        {showDecimals && onDecimalsChange && (
          <div className="w-20">
            <Input
              label="Decimals"
              value={decimals ?? ''}
              onChange={(e) => onDecimalsChange(e.target.value)}
              inputMode="numeric"
              placeholder="2"
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setForcedCustom(false);
            onChange('');
          }}
          className="pb-2 text-xs text-muted hover:text-body"
        >
          ← Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Select
          label="Unit"
          value={value || undefined}
          onChange={(v) => {
            if (v === CUSTOM_VALUE) {
              setForcedCustom(true);
              onChange('');
            } else {
              onChange(v);
            }
          }}
          options={OPTIONS}
          placeholder="None"
        />
      </div>
      {showDecimals && onDecimalsChange && (
        <div className="w-20">
          <Input
            label="Decimals"
            value={decimals ?? ''}
            onChange={(e) => onDecimalsChange(e.target.value)}
            inputMode="numeric"
            placeholder="2"
          />
        </div>
      )}
    </div>
  );
}

export { resolveUnit };
