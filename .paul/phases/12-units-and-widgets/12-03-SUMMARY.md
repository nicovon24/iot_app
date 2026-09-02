---
phase: 12-units-and-widgets
plan: 03
subsystem: ui
tags: [dashboards, widgets, gauge, bar-chart, value-tile, recharts]

requires:
  - phase: 12-units-and-widgets
    provides: "12-01's presentation fragment pattern, 12-02's config-panel checkbox conventions"
provides:
  - Gauge progress-bar style (BAR, 4th option alongside DIAL/THERMOMETER/RADIAL)
  - Bar-chart stacked flag (ALL scope only)
  - Value-tile sparkline flag (SINGLE scope only, graceful fallback with no history)
affects: []

tech-stack:
  added: []
  patterns:
    - 'Widget variants added as config flags on an existing type, not new registry entries, when the datasource shape is unchanged — costs 2 touchpoints instead of ~8'
    - 'Scope-gated config controls (stacked: ALL only, sparkline: SINGLE only) enforced in the cell/config-panel, not the Zod schema — the schema has no notion of scope-conditional fields'

key-files:
  created: []
  modified:
    - backend/src/dashboards/widget-registry.ts
    - frontend/src/widgets/charts/gauge/GaugeWidget.tsx
    - frontend/src/widgets/charts/bar/MultiSeriesBarChartWidget.tsx
    - frontend/src/widgets/charts/tile/ValueTileWidget.tsx
    - frontend/src/components/dashboards/renderer/CardCells.tsx
    - frontend/src/components/dashboards/widget-config/AddWidgetPanel/ConfigureStep.tsx
    - frontend/src/components/dashboards/widget-config/AddWidgetPanel/index.tsx

key-decisions:
  - "All three ship as boolean/enum flags on existing widget types rather than new types — matches the phase's stated design principle that presentation variants of already-fetched data don't need a new datasource shape"
  - "Sparkline uses a fixed short lookback window independent of the dashboard's own time window (CardCells.tsx SPARKLINE_WINDOW_MS) — a trend indicator, not a synced chart"

patterns-established: []

duration: unknown (applied 2026-08-12, unify run retroactively 2026-09-02)
started: 2026-08-12
completed: 2026-08-12
description: 'Gauge BAR style + bar-chart stacked flag + value-tile sparkline flag, all as config additions to existing widget types'
type: Summary
about: 'iot-app'
---

# Phase 12 Plan 03: Three cheap widget wins as flags Summary

**Progress-bar gauge style, stacked bar charts, and sparkline value-tiles — all shipped as config flags on existing widget types instead of new registry entries.**

Written retroactively 2026-09-02 via `/paul:unify`, verified by reading the actual code (plan applied 2026-08-12, an earlier session).

## Acceptance Criteria Results

| Criterion                      | Status | Notes                                                                                                                                                                                                                                                         |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1: Gauge progress-bar style | Pass   | `widget-registry.ts:183` — `style` enum includes `'BAR'`; `GaugeWidget.tsx:71` renders it, `function Bar()` at line 247                                                                                                                                       |
| AC-2: Stacked bar chart        | Pass   | `widget-registry.ts:209` — `stacked: z.boolean().optional()`; `MultiSeriesBarChartWidget.tsx:124` — `stackId={stacked ? 'stack' : undefined}`                                                                                                                 |
| AC-3: Sparkline value-tile     | Pass   | `widget-registry.ts:168` — `sparkline` flag; `CardCells.tsx:37` — `wantsSparkline = !all && Boolean(config.sparkline)` (SINGLE-scope gate, exact match to the plan's AC); `ValueTileWidget.tsx:35` falls back cleanly when `sparklineData` is empty/undefined |

## Files Created/Modified

| File                                                            | Change   | Purpose                                                                              |
| --------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `backend/src/dashboards/widget-registry.ts`                     | Modified | Added `'BAR'` to gauge style enum, `stacked` to bar-chart, `sparkline` to value-tile |
| `frontend/src/widgets/charts/gauge/GaugeWidget.tsx`             | Modified | New `Bar()` render branch, `GaugeStyle` type widened                                 |
| `frontend/src/widgets/charts/bar/MultiSeriesBarChartWidget.tsx` | Modified | `stackId` prop on each `<Bar>`                                                       |
| `frontend/src/widgets/charts/tile/ValueTileWidget.tsx`          | Modified | Optional `sparklineData` prop, small `<LineChart>` when present                      |
| `frontend/src/components/dashboards/renderer/CardCells.tsx`     | Modified | Conditional history fetch for sparkline, scope-gated                                 |
| `ConfigureStep.tsx` / `AddWidgetPanel/index.tsx`                | Modified | Checkboxes for stacked/sparkline, state wiring, scope gating                         |

## Deviations from Plan

**Path differences (not functional):** `GaugeWidget.tsx` lives at `frontend/src/widgets/charts/gauge/GaugeWidget.tsx` (plan said `frontend/src/widgets/charts/GaugeWidget.tsx`); same for the bar/tile widgets, all now under type-named subfolders (`charts/bar/`, `charts/tile/`). Consistent with the same later reorganization noted in 12-01/12-02's SUMMARY. No functional gap.

**Verification method:** manual click-through steps from the plan (gauge BAR render, stacked toggle, sparkline fallback) were not re-run live in this retroactive UNIFY — confirmed via code inspection that the exact conditional logic the plan's AC describes is present and matches. Still owed a live browser pass, same as the rest of Phase 10/11/12 per STATE.md.

## Next Phase Readiness

**Ready:** No dependents within this phase — 12-04/12-05 are independent widget additions.

**Concerns:** No live browser verification (see Deviations).

**Blockers:** None.

---

_Completed: 2026-08-12 (SUMMARY written retroactively 2026-09-02)_
