import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/**
 * The time range every timeseries widget on a dashboard reads over.
 *
 * Validated with Zod rather than class-validator decorators for the same reason widget configs
 * are: it's a tagged union stored as Json, and `startTs`/`endTs` are meaningless on a LAST
 * window. A flat DTO with all three fields optional could not express "exactly one of these
 * shapes" without a custom validator anyway.
 *
 *   LAST  — a rolling window ending at request time. Survives being reopened next week.
 *   FIXED — an absolute range. What you want when investigating a specific incident.
 */
// The ordering check sits on the union, not the FIXED branch: `.refine()` returns a ZodEffects,
// and discriminatedUnion only accepts plain ZodObjects as its options.
const timeWindowSchema = z
  .discriminatedUnion('kind', [
    z.object({
      kind: z.literal('LAST'),
      ms: z.number().int().positive(),
    }),
    z.object({
      kind: z.literal('FIXED'),
      startTs: z.number().int().nonnegative(),
      endTs: z.number().int().nonnegative(),
    }),
  ])
  .refine((w) => w.kind !== 'FIXED' || w.startTs < w.endTs, {
    message: 'startTs must be earlier than endTs',
    path: ['startTs'],
  });

export type TimeWindow = z.infer<typeof timeWindowSchema>;

/**
 * Throws BadRequestException naming the offending field. Called before the save transaction
 * opens, alongside validateWidgetConfig, so an invalid window blocks the whole save rather
 * than being written and failing at render time.
 */
export function validateTimeWindow(value: unknown): void {
  // Absent is valid and means "no dashboard-wide window" — widgets fall back to their own
  // default. Existing dashboards predate this field entirely.
  if (value === undefined || value === null) return;

  const result = timeWindowSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.') || '(root)';
    throw new BadRequestException(`timeWindow invalid at "${field}": ${issue.message}`);
  }
}
