'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  /** Rendered inside the field, before the text — a search glass, a clock, etc. */
  icon?: ReactNode;
  /** Compact height, for inputs sitting inline in a toolbar rather than in a form. */
  compact?: boolean;
}

/**
 * The text-field counterpart to `Select`. Both now render the same border, background, focus
 * ring and label treatment, so a form built from them looks like one thing.
 *
 * Introduced because every input across the dashboard builder had its own hand-copied class
 * string — the widget title, the dashboard title, the key-search boxes, the datetime bounds —
 * and they had already drifted in padding and placeholder color.
 */
export function Input({ label, icon, compact = false, className = '', ...props }: InputProps) {
  const field = (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">{icon}</span>
      )}
      <input
        {...props}
        className={`w-full rounded-md border border-border-strong bg-surface text-heading outline-none transition-colors placeholder:text-muted focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 ${
          compact ? 'py-1.5 text-xs' : 'py-2 text-sm'
        } ${icon ? 'pl-8 pr-3' : 'px-3'} ${className}`}
      />
    </div>
  );

  if (!label) return field;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="t-field">{label}</span>
      {field}
    </div>
  );
}

/**
 * Checkbox matching the same family. `accent-accent` alone was the previous approach, which
 * leaves the box itself at the browser default size and alignment — inconsistent between the
 * key pickers and the data-key groups.
 */
export function Checkbox({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      {...props}
      className={`h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-border-strong accent-accent ${className}`}
    />
  );
}
