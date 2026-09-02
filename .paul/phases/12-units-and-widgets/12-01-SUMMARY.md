---
phase: 12-units-and-widgets
plan: 01
subsystem: ui
tags: [units, formatting, dashboards, widgets, zod]

requires:
  - phase: 10-dashboard-builder
    provides: widget-registry.ts's presentation fragment, EntityWidgetConfig, ChartCells/CardCells renderer split
provides:
  - Frontend-only unit catalog (frontend/src/lib/format/units.ts — categories, resolveUnit, suggestUnit)
  - unit/decimals on the shared backend presentation fragment (all 17 widget types, not just 5)
  - One formatter (formatTelemetryValue) replacing the two duplicates that existed before
affects: [12-02-unit-picker, 12-04-multi-key-units]

tech-stack:
  added: []
  patterns:
    - 'Single formatter chokepoint (formatTelemetryValue) — chart axis/tooltip formatting always goes through it via axisTick/withUnit wrappers, never a widget-local formatter'
    - 'Catalog stores/compares by symbol string, not id — old free-text config values stay valid without a migration or fallback branch'

key-files:
  created: [frontend/src/lib/format/units.ts]
  modified:
    - backend/src/dashboards/widget-registry.ts
    - frontend/src/dashboards/renderer/shared.tsx
    - frontend/src/lib/format/format.ts
    - frontend/src/widgets/charts/chart-shared.ts
    - frontend/src/widgets/charts/line/LineChartWidget.tsx
    - frontend/src/widgets/charts/bar/BarChartWidget.tsx
    - frontend/src/widgets/charts/line/MultiSeriesLineChartWidget.tsx
    - frontend/src/widgets/charts/bar/MultiSeriesBarChartWidget.tsx
    - frontend/src/widgets/charts/scatter/ScatterChartWidget.tsx
    - frontend/src/components/dashboards/renderer/ChartCells.tsx
    - frontend/src/components/dashboards/renderer/CardCells.tsx

key-decisions:
  - 'unit/decimals live on the shared presentation Zod fragment, not per-type — zero migration since the JSON shape for widgets that already had unit is unchanged'
  - "Catalog is frontend-only; no backend telemetry_definitions table — conversion (if it ever exists) stays a frontend concern per the phase's CONTEXT.md decision"

patterns-established:
  - 'axisTick (bare number, no unit — avoids axis chartjunk) vs withUnit(unit) (tooltip, unit suffixed) as the two ways every chart formats a value'

duration: unknown (applied 2026-08-12, unify run retroactively 2026-09-02)
started: 2026-08-12
completed: 2026-08-12
description: "Unit catalog + unit/decimals on every widget type's config + single formatter replacing two duplicates"
type: Summary
about: 'iot-app'
---

# Phase 12 Plan 01: Unit catalog + shared field + one formatter Summary

**Every dashboard widget type can now carry a real `unit`/`decimals` on its config, and every chart formats values through one shared `formatTelemetryValue` instead of two duplicated formatters.**

This SUMMARY was written retroactively on 2026-09-02 via `/paul:unify`, reconciling the plan against the current codebase rather than against session memory (the plan was applied 2026-08-12, in an earlier session). Verified by reading the actual files, not by re-trusting the plan.

## Acceptance Criteria Results

| Criterion                                                                           | Status | Notes                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1: All 17 widget types accept `unit`/`decimals`, existing configs still validate | Pass   | `backend/src/dashboards/widget-registry.ts:58-59` — `unit`/`decimals` on the shared `presentation` fragment, no longer duplicated in `scale`/`calendar-heatmap`/`value-map` (grep confirms one declaration site)              |
| AC-2: One formatter, no more duplicate rounding logic                               | Pass   | `formatValue` no longer exists in `chart-shared.ts` (grep: 0 hits); `axisTick`/`withUnit` wrap `formatTelemetryValue`                                                                                                         |
| AC-3: A configured unit renders on widgets that had none before                     | Pass   | `LineChartWidget.tsx` (and Bar/MultiSeries*/Scatter) accept a `unit` prop, wired to `YAxis label` + tooltip `formatter={withUnit(unit)}`                                                                                      |
| AC-4: `units.ts` catalog resolves known/unknown units safely                        | Pass   | `resolveUnit`/`suggestUnit`/`UNIT_CATEGORIES` exist and are covered by `frontend/src/lib/format/units.test.ts` (migrated from the plan's `units.check.ts` to a real Vitest file in the same 2026-09-02 session, see Phase 13) |

## Files Created/Modified

| File                                          | Change   | Purpose                                                          |
| --------------------------------------------- | -------- | ---------------------------------------------------------------- |
| `frontend/src/lib/format/units.ts`            | Created  | Unit catalog, `resolveUnit`, `suggestUnit`                       |
| `backend/src/dashboards/widget-registry.ts`   | Modified | `unit`/`decimals` moved to shared `presentation` fragment        |
| `frontend/src/dashboards/renderer/shared.tsx` | Modified | `EntityWidgetConfig.decimals?` added next to existing `unit?`    |
| `frontend/src/lib/format/format.ts`           | Modified | `formatTelemetryValue` takes `{unit?, decimals?}` options object |
| `frontend/src/widgets/charts/chart-shared.ts` | Modified | `formatValue` deleted, `axisTick`/`withUnit` added               |
| Line/Bar/MultiSeries*/Scatter chart widgets   | Modified | `unit` prop threaded to axis label + tooltip formatter           |
| `ChartCells.tsx`/`CardCells.tsx`              | Modified | `unit={config.unit}` passed down from cell to widget             |

## Deviations from Plan

**Path difference (not a functional deviation):** the plan specified `frontend/src/lib/units.ts`; the actual file lives at `frontend/src/lib/format/units.ts`, alongside the rest of the format/unit logic. Likely reorganized in a later session — no functional impact, all exports match the plan's spec (`resolveUnit`, `suggestUnit`, `UNIT_CATEGORIES`).

**Verification method:** the plan's self-check (`units.check.ts`, assert-based, run manually via `tsx`) was superseded by a real Vitest test (`units.test.ts`) in the same 2026-09-02 session that ran this UNIFY — see Phase 13's batch 1. Same assertions, now runs in CI.

## Next Phase Readiness

**Ready:**

- Catalog and shared formatter are the foundation plans 12-02 (unit picker UI) and 12-04 (multi-key units) build on — both already applied per STATE.md.

**Concerns:** None found during reconciliation.

**Blockers:** None.

---

_Completed: 2026-08-12 (SUMMARY written retroactively 2026-09-02)_
