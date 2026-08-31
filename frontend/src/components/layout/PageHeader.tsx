'use client';

import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  /** One sentence under the rule. Accepts nodes so a value inside it can be lifted
   * to --color-body without the caller reaching for dangerouslySetInnerHTML. */
  description?: ReactNode;
  /** Status pills and actions, right-aligned on the title's baseline. */
  actions?: ReactNode;
}

/**
 * The page header, identical on all nine screens.
 *
 * Every board opens the same way: a 42px title, a 96×2px accent rule under it, a sentence,
 * and whatever status or action belongs on the right. Naming it means the nine pages agree
 * by construction — the previous flat list of h1s had already drifted into four different
 * sizes — and it is the one place the 2px rule that closes the header is expressed.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex shrink-0 items-start gap-5">
      <div className="min-w-0">
        <h1 className="t-title">{title}</h1>
        {/* The rule is the system's signature. Fixed width on purpose: tied to the
          * title's length it would wobble from page to page, and its job is to be the
          * one constant every screen opens with. */}
        <div aria-hidden className="mt-3 h-0.5 w-24 bg-accent-strong" />
        {description && <p className="t-body mt-3.5 max-w-[440px]">{description}</p>}
      </div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/**
 * The "LIVE" / "5 ONLINE" pill that sits opposite a page title.
 *
 * The blinking square is the only thing in the app that moves on its own, which is what
 * makes it read as a connection state rather than as decoration — and why it is reserved
 * for counts that really are arriving over the wire.
 */
export function StatusPill({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`flex items-center gap-[7px] border px-3 py-2.5 ${
        muted ? 'border-border' : 'border-accent-strong/35'
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 ${muted ? 'bg-faint' : 'animate-live bg-accent'}`}
      />
      <span className={`t-label ${muted ? '' : '!text-accent'}`}>{label}</span>
    </span>
  );
}

/**
 * A section break inside a page: a heading, an optional mono count, an optional action.
 * Used above the device grid on Overview and above each list elsewhere.
 */
export function SectionHeader({
  title,
  meta,
  action,
  className = '',
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex shrink-0 items-baseline gap-3 ${className}`}>
      <h2 className="t-heading">{title}</h2>
      {meta && <span className="t-label">{meta}</span>}
      {action && <div className="ml-auto flex items-center gap-3">{action}</div>}
    </div>
  );
}
