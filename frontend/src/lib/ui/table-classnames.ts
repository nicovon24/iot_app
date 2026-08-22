/**
 * Shared HeroUI `<Table classNames>` presets.
 *
 * Six widgets each carried a private copy of this object, and they had drifted in ways
 * nobody chose: three aligned left and three centre, one made rows clickable, one wrapped
 * itself in a card while the rest were transparent, and cell padding was py-3 in five of
 * them and py-2.5 in the sixth. Every one of those differences is a real parameter, so
 * they are arguments now rather than six near-copies.
 *
 * HeroUI's Table ignores the app's tokens entirely (the plugin is registered with no
 * theme), which is why every slot has to be spelled out here instead of inherited.
 */
export interface TableClassNamesOptions {
  /** Numeric and status columns read better centred; names and paths read better flush left. */
  align?: 'left' | 'center';
  /** `fill` makes the table own its height and scroll internally — for a widget in a fixed
   * grid cell. `auto` lets the table size to content and the page scroll instead. */
  height?: 'fill' | 'auto';
  /** Rows that navigate somewhere get a pointer; rows that don't shouldn't pretend to. */
  interactive?: boolean;
  /** `card` draws the surface around the table; `bare` assumes a parent already did. */
  surface?: 'bare' | 'card';
}

export function tableClassNames({
  align = 'center',
  height = 'fill',
  interactive = false,
  surface = 'bare',
}: TableClassNamesOptions = {}) {
  const alignment = align === 'left' ? 'text-left' : 'text-center';

  return {
    base: height === 'fill' ? 'h-full min-h-0' : '',
    wrapper:
      surface === 'card'
        ? 'glass-card p-0 table-scroll overflow-auto'
        : `${height === 'fill' ? 'h-full ' : ''}rounded-none border-0 bg-transparent p-0 shadow-none table-scroll overflow-auto`,

    // The header sits on the card, not on the page. It used to take `bg-surface`, which is
    // darker than the surface behind it — a sticky header that reads as a hole. It has to
    // stay opaque so rows scrolling under it don't show through.
    th: `bg-surface-card ${alignment} t-label first:rounded-none last:rounded-none first:pl-4 last:pr-4 border-b border-border py-2.5`,

    td: `${alignment} first:pl-4 last:pr-4 py-3 text-sm text-body`,

    // Hover lifts the row toward the light instead of dropping it toward the page
    // background, and carries a trace of the accent so the feedback is the brand's.
    tr: [
      'border-b border-border last:border-b-0',
      'transition-colors duration-fast ease-out',
      'group-data-[hover=true]:bg-tint',
      interactive ? 'cursor-pointer' : '',
    ]
      .filter(Boolean)
      .join(' '),
  };
}
