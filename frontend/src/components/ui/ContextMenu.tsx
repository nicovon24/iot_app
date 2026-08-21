'use client';

import * as RadixContextMenu from '@radix-ui/react-context-menu';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** Renders in the danger color and sits below a separator — destructive actions only. */
  danger?: boolean;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  children: ReactNode;
  /** When true the trigger behaves like plain content and no menu opens on right-click. */
  disabled?: boolean;
}

/**
 * Right-click menu, styled to match Select's dropdown. Radix handles the parts that are easy
 * to get wrong by hand: positioning at the cursor, flipping when it would overflow the
 * viewport, Escape/click-outside dismissal, and keyboard navigation once open.
 */
export function ContextMenu({ items, children, disabled }: ContextMenuProps) {
  if (disabled) return <>{children}</>;

  const primary = items.filter((i) => !i.danger);
  const destructive = items.filter((i) => i.danger);

  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger asChild>{children}</RadixContextMenu.Trigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.Content asChild collisionPadding={8}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.12 }}
            className="glass-card z-50 min-w-44 overflow-hidden !rounded-md p-1"
          >
            {primary.map((item) => (
              <MenuItem key={item.label} item={item} />
            ))}
            {primary.length > 0 && destructive.length > 0 && (
              <RadixContextMenu.Separator className="my-1 h-px bg-border" />
            )}
            {destructive.map((item) => (
              <MenuItem key={item.label} item={item} />
            ))}
          </motion.div>
        </RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
}

function MenuItem({ item }: { item: ContextMenuItem }) {
  const Icon = item.icon;
  return (
    <RadixContextMenu.Item
      onSelect={item.onSelect}
      className={`flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm outline-none ${
        item.danger
          ? 'text-danger data-[highlighted]:bg-danger-strong data-[highlighted]:text-white'
          : 'text-body data-[highlighted]:bg-surface data-[highlighted]:text-heading'
      }`}
    >
      {Icon && <Icon size={14} />}
      {item.label}
    </RadixContextMenu.Item>
  );
}
