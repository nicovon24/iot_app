---
phase: 12-units-and-widgets
plan: 04
subsystem: ui
tags: [units, dashboards, widgets, multi-key, recharts, dual-axis]

requires:
  - phase: 12-units-and-widgets
    provides: "12-01's resolveUnit/formatTelemetryValue, 12-02's UnitPicker"
provides:
  - Per-key units on value-cards and timeseries-table (units? Record<string,string>)
  - groupKeysByUnit pure function (dual-axis grouping, capped at 2 axes, 3+ groups degrade to omittedKeys)
  - New widget type multi-key-chart ("Comparison Chart") — single entity, 2-8 keys, dual Y-axis
affects: []

tech-stack:
  added: []
  patterns:
    - "Dual-axis grouping caps at 2 axes by design — a 3rd distinct unit group never gets a 3rd axis or gets silently normalized onto a shared one (which would strip the unit meaning); it's reported via the existing omittedCount convention instead"

key-files:
  created:
    - frontend/src/lib/format/group-keys-by-unit.ts
    - frontend/src/widgets/charts/line/MultiKeyChartWidget.tsx
  modified:
    - backend/src/dashboards/widget-registry.ts
    - frontend/src/components/dashboards/widget-config/widget-registry.tsx
    - frontend/src/components/dashboards/renderer/ChartCells.tsx
    - frontend/src/components/dashboards/widget-config/WidgetPreview.tsx
    - frontend/src/widgets/charts/tile/ValueCardsWidget.tsx
    - frontend/src/widgets/entity/TimeseriesTableWidget.tsx

key-decisions:
  - 'multi-key-chart is single-entity only (supportsAllScope: false, with an explicit comment) — N entities x M keys was rejected as unreadable during phase design, not deferred as a TODO'
  - "Per-key units keyed by telemetry key name (Record<string,string>), reusing 12-01's resolveUnit for each lookup rather than inventing a second unit-resolution path"

patterns-established: []

duration: unknown (applied 2026-08-12, unify run retroactively 2026-09-02)
started: 2026-08-12
completed: 2026-08-12
description: 'Per-key units on multi-key widgets + new Comparison Chart widget type with dual-axis unit grouping'
type: Summary
about: 'iot-app'
---

# Phase 12 Plan 04: Per-key units + multi-key comparison chart Summary

**value-cards and timeseries-table can now show a different unit per telemetry key, and a new "Comparison Chart" widget type plots several of one entity's keys on one chart with automatic dual-axis grouping by unit.**

Written retroactively 2026-09-02 via `/paul:unify`, verified against the current codebase (plan applied 2026-08-12, an earlier session; the grouping function itself was additionally exercised today by 5 real Vitest test cases during Phase 13's batch 1 — see that phase's SUMMARY).

## Acceptance Criteria Results

| Criterion                                                      | Status | Notes                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1: Per-key units render on value-cards and timeseries-table | Pass   | Both widgets accept and use `units?: Record<string,string>`, confirmed in `ValueCardsWidget.tsx`/`TimeseriesTableWidget.tsx`                                                                                                                                                                                            |
| AC-2: New multi-key-chart widget type exists end-to-end        | Pass   | Backend schema (`widget-registry.ts:285`), frontend registry (`widget-registry.tsx:219`, label "Comparison Chart"), `MultiKeyChartCell` (`ChartCells.tsx:153`), `WidgetPreview.tsx:206` case, `MultiKeyChartWidget.tsx` component — `next build` compiles clean, confirming the `WidgetPreview` switch stays exhaustive |
| AC-3: Three or more distinct units degrade gracefully          | Pass   | `group-keys-by-unit.ts:40-44` — `axes = order.slice(0,2)`, `omittedKeys = order.slice(2).flatMap(...)`. Directly verified today by the Vitest migration of this file's check (5 cases: 1/2/3-unit-group, all-unitless, mixed)                                                                                           |
| AC-4: Entity scope single-entity only, capped at 8 keys        | Pass   | `widget-registry.tsx:230` — `supportsAllScope: false` with rationale comment; backend schema `telemetryKeys: z.array(...).min(2).max(8)`                                                                                                                                                                                |

## Files Created/Modified

| File                                                                   | Change   | Purpose                                                               |
| ---------------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| `frontend/src/lib/format/group-keys-by-unit.ts`                        | Created  | Pure dual-axis grouping function                                      |
| `frontend/src/widgets/charts/line/MultiKeyChartWidget.tsx`             | Created  | Dual Y-axis recharts component for the new widget type                |
| `backend/src/dashboards/widget-registry.ts`                            | Modified | `units` on value-cards/timeseries-table, new `multi-key-chart` schema |
| `frontend/src/components/dashboards/widget-config/widget-registry.tsx` | Modified | `multi-key-chart` registry entry                                      |
| `frontend/src/components/dashboards/renderer/ChartCells.tsx`           | Modified | `MultiKeyChartCell`                                                   |
| `frontend/src/components/dashboards/widget-config/WidgetPreview.tsx`   | Modified | Gallery preview case                                                  |

## Deviations from Plan

**Path differences (not functional):** `group-keys-by-unit.ts` lives under `frontend/src/lib/format/` (plan said `frontend/src/lib/`); `MultiKeyChartWidget.tsx` lives under `frontend/src/widgets/charts/line/` (plan said `frontend/src/widgets/charts/`) — same later reorganization noted across 12-01/02/03's SUMMARYs. No functional gap; every function/type/prop the plan specified is present with matching behavior.

**Verification method:** the plan's manual click-through (gallery preview, live dual-axis render, 3-key degrade) was not re-run live in this retroactive UNIFY. The one piece that _was_ re-verified live today is `groupKeysByUnit` itself — migrated from a manual `tsx`-run assert check into 5 real Vitest test cases as part of Phase 13's batch 1, all passing. The rest (UI wiring, live rendering) is confirmed by code inspection only, still owed a browser pass per STATE.md.

## Next Phase Readiness

**Ready:** This closes out the phase's "real gap" (per the plan's own Purpose section) — comparing two different-unit measures on one chart, which nothing in the app could do before.

**Concerns:** No live browser verification (see Deviations) — same gap as the rest of Phase 10/11/12 per STATE.md.

**Blockers:** None.

---

_Completed: 2026-08-12 (SUMMARY written retroactively 2026-09-02)_
