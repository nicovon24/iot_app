'use client';

import { motion } from 'framer-motion';

export interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

const shimmerTransition = {
  duration: 1.6,
  ease: 'linear' as const,
  repeat: Infinity,
};

/** Base shimmer placeholder — size/shape driven entirely by className/style. A translucent
 * block with a soft gradient band sweeping across it on a loop. */
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div aria-hidden className={`relative overflow-hidden rounded-md bg-white/[0.06] ${className}`} style={style}>
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.09) 50%, transparent 100%)',
          width: '60%',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={shimmerTransition}
      />
    </div>
  );
}

/** Mimics a stat tile's shape: a small label bar + a larger number bar. */
export function StatTileSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3 w-16 rounded-full" />
      <Skeleton className="h-7 w-12 rounded-lg" />
    </div>
  );
}

/** Mimics N table rows of M columns, used in place of a real <Table> while loading. */
export function TableRowsSkeleton({ rows = 4, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface-card px-4 py-3"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-3.5 flex-1 rounded-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Scattered "pin" positions (percent of container) used by MapSkeleton — kept
 * away from the top-right corner where the real style-toggle control sits. */
const MAP_PIN_POSITIONS = [
  { top: '28%', left: '18%' },
  { top: '58%', left: '32%' },
  { top: '40%', left: '52%' },
  { top: '70%', left: '68%' },
  { top: '22%', left: '74%' },
  { top: '80%', left: '22%' },
];

/** Mimics the fleet map's shape while devices/positions are loading: the same base
 * shimmer block used everywhere else, plus the style-toggle control outline and a
 * handful of scattered pin dots suggesting markers about to appear. */
export function MapSkeleton() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-none">
      <Skeleton className="absolute inset-0 rounded-none" />

      <div className="absolute right-2 top-2 flex overflow-hidden rounded-md border border-border">
        <Skeleton className="h-6 w-16 rounded-none" />
        <Skeleton className="h-6 w-16 rounded-none" />
      </div>

      {MAP_PIN_POSITIONS.map((pos, i) => (
        <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={pos}>
          <Skeleton className="h-3 w-3 rounded-full" />
        </span>
      ))}
    </div>
  );
}

/** Mimics N entity-row cards (avatar + name/type + trailing meta/actions), used
 * in place of the real card-row list while loading. */
export function EntityRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-card px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-28 rounded-full" />
              <Skeleton className="h-2.5 w-14 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
