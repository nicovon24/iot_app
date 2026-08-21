'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  /** When any option in the list has a group, options are rendered under a Radix Select.Group
   * per distinct group value (first-seen order), with ungrouped options rendered after, outside
   * any group. Zero visual difference for lists where no option sets this. */
  group?: string;
}

export interface SelectProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  /** Matches Input's `compact` — same reduced height/text-size, for a Select sitting inline
   * next to compact inputs rather than in its own form field. */
  compact?: boolean;
}

/**
 * Minimal Radix Select wrapper, styled to match the app theme, with an animated dropdown.
 * Trigger shares its border/background/focus tokens with `Input` 1:1 — the two are meant to
 * be visually interchangeable wherever a form mixes text fields and dropdowns.
 */
function renderOption(option: SelectOption) {
  return (
    <RadixSelect.Item
      key={option.value}
      value={option.value}
      className="flex cursor-pointer items-center justify-between rounded px-3 py-2 text-sm text-body outline-none data-[highlighted]:bg-surface data-[highlighted]:text-heading"
    >
      <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator>
        <Check size={14} className="text-accent" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}

export function Select({ label, placeholder, value, onChange, options, disabled, compact = false }: SelectProps) {
  const hasGroups = options.some((o) => o.group);
  const groupNames = hasGroups ? Array.from(new Set(options.filter((o) => o.group).map((o) => o.group!))) : [];
  const ungrouped = hasGroups ? options.filter((o) => !o.group) : [];

  return (
    <RadixSelect.Root value={value} onValueChange={onChange} disabled={disabled}>
      <div className="flex flex-col gap-1.5">
        {label && <span className="text-sm font-medium text-body">{label}</span>}
        <RadixSelect.Trigger
          className={`flex items-center justify-between gap-2 rounded-md border border-border-strong bg-surface text-heading outline-none transition-colors data-[placeholder]:text-muted data-[state=open]:border-accent disabled:cursor-not-allowed disabled:opacity-50 ${
            compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'
          }`}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown size={compact ? 12 : 14} className="text-muted" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
      </div>
      <RadixSelect.Portal>
        <RadixSelect.Content asChild position="popper" sideOffset={6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.12 }}
            className="glass-card z-50 w-[var(--radix-select-trigger-width)] overflow-hidden !rounded-md"
          >
            <RadixSelect.Viewport className="max-h-64 p-1">
              <AnimatePresence>
                {options.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted">No options</div>
                ) : hasGroups ? (
                  <>
                    {groupNames.map((groupName) => (
                      <RadixSelect.Group key={groupName}>
                        <RadixSelect.Label className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                          {groupName}
                        </RadixSelect.Label>
                        {options.filter((o) => o.group === groupName).map(renderOption)}
                      </RadixSelect.Group>
                    ))}
                    {ungrouped.map(renderOption)}
                  </>
                ) : (
                  options.map(renderOption)
                )}
              </AnimatePresence>
            </RadixSelect.Viewport>
          </motion.div>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
