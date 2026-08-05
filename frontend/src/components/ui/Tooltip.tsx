'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export interface TooltipProps {
  label: string;
  children: ReactNode;
  /** Preferred side — Radix auto-flips to whichever side/edge actually fits the viewport. */
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Portal-rendered tooltip (mounted on `document.body`, not inline next to the trigger). Unlike a
 * plain `position: absolute` bubble, this can never inflate a scrollable ancestor's scroll area
 * or get clipped by a card's `overflow-hidden` — and Radix's collision detection auto-flips the
 * side (e.g. right → left, or top/bottom) whenever the preferred side doesn't fit the viewport.
 */
export function Tooltip({ label, children, side = 'right' }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={150}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content asChild side={side} sideOffset={8} collisionPadding={8}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="z-50 select-none whitespace-nowrap rounded-md bg-navy-950 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
            >
              {label}
              <RadixTooltip.Arrow width={11} height={5} className="fill-navy-950" />
            </motion.div>
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
