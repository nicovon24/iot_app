---
phase: 12-units-and-widgets
plan: 05
subsystem: ui
tags: [dashboards, widgets, xss-safety, no-datasource]

requires: []
provides:
  - New widget type "label" — free-form static text, no entity/telemetry binding
  - First real exercise of the entity: 'none' config-panel branch (previously dormant/unreached)
affects: []

tech-stack:
  added: []
  patterns:
    - "Plain JSX text-node rendering ({text} as a child) is XSS-safe by construction — no sanitizer or dangerouslySetInnerHTML needed for user-authored text"

key-files:
  created: [frontend/src/widgets/charts/tile/LabelWidget.tsx]
  modified:
    - backend/src/dashboards/widget-registry.ts
    - frontend/src/components/dashboards/widget-config/widget-registry.tsx
    - frontend/src/components/dashboards/widget-config/AddWidgetPanel/ConfigureStep.tsx
    - frontend/src/components/dashboards/widget-config/AddWidgetPanel/index.tsx
    - frontend/src/components/dashboards/widget-config/AddWidgetPanel/type-config-fields.ts

key-decisions:
  - "label's backend schema is its own bare z.object(), NOT built on datasource()/optionalDatasource() — it structurally cannot accept an entityId, rather than accepting and ignoring one"
  - "No markdown/sanitizer dependency added — plain text only, deferred until there's a real request for rich text (and a sanitizer becomes non-negotiable at that point, dashboards are shared with customers)"

patterns-established: []

duration: unknown (applied 2026-08-12, unify run retroactively 2026-09-02)
started: 2026-08-12
completed: 2026-08-12
description: "New no-datasource 'label' widget type for static dashboard text (headers, notes), first real use of the entity:'none' config-panel path"
type: Summary
about: "iot-app"
---

# Phase 12 Plan 05: Label / static text widget Summary

**A new "label" widget type lets dashboards carry free-form static text — section headers, notes, instructions — with no entity or telemetry binding, and no new dependency.**

Written retroactively 2026-09-02 via `/paul:unify`, verified against the current codebase (plan applied 2026-08-12, an earlier session).

## Acceptance Criteria Results

| Criterion                                                                 | Status | Notes                                                                                                                                                                                                                |
| ------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1: Label has no datasource, backend rejects entity fields structurally | Pass   | `widget-registry.ts:275` — `label: z.object({ text, align, ...presentation })`, no `datasource()`/`optionalDatasource()` spread, cannot express `entityId`                                                           |
| AC-2: Config panel shows a real text form, not the dormant placeholder    | Pass   | `text`/`align` wired via `typeConfig` (`AddWidgetPanel/index.tsx:506-509`), `canAdd` has an explicit `widgetType === 'label'` branch (line 227) requiring non-empty text                                             |
| AC-3: Renders as plain, safe text                                         | Pass   | `LabelWidget.tsx` renders `{text}` as a JSX child with an explicit comment on why this is XSS-safe by construction — no `dangerouslySetInnerHTML`, no sanitizer dependency added (confirmed via `package.json` grep) |

## Files Created/Modified

| File                                                        | Change   | Purpose                                                       |
| ----------------------------------------------------------- | -------- | ------------------------------------------------------------- |
| `frontend/src/widgets/charts/tile/LabelWidget.tsx`          | Created  | Plain-text render, `whitespace-pre-wrap` for line breaks      |
| `backend/src/dashboards/widget-registry.ts`                 | Modified | `label` schema, own shape, no datasource                      |
| Frontend widget registry + `ConfigureStep`/`AddWidgetPanel` | Modified | Gallery entry, text/align form, `canAdd`/`buildConfig` wiring |

## Deviations from Plan

**Implementation mechanism changed, behavior did not.** The plan specified a manual `if (widgetType === 'label')` early-return branch inside `buildConfig()`. The actual code instead declares `text`/`align` as entries in `type-config-fields.ts`'s generic per-widget-type field registry (`TYPE_CONFIG_FIELDS`), written into the config via a shared `typeConfig.buildInto()` call — the same declarative mechanism used for every other type-specific field (agg, gaugeStyle, stacked, sparkline, etc.), documented in STATE.md's "Addendum 3" as a later-session refactor of what used to be hand-written per-field branches. Functionally equivalent: `label`'s `shouldSave`/`toConfig` entries write `{text, align}` into the config exactly when the plan specified. Confirmed by tracing `typeConfig.buildInto(widgetType, scope, config)` (`AddWidgetPanel/index.tsx:346`) into `use-type-config.ts`'s `buildInto()`, which applies each field's `shouldSave`/`toConfig` — not a gap, a since-generalized implementation of the same requirement.

**Path difference (not functional):** `LabelWidget.tsx` lives at `frontend/src/widgets/charts/tile/LabelWidget.tsx` (plan said `frontend/src/widgets/charts/LabelWidget.tsx`) — same later reorganization noted across this phase's other SUMMARYs.

**Verification method:** the plan's manual click-through (create label, save/reload/edit, attempt `<script>` injection) was not re-run live in this retroactive UNIFY. Rendering safety is structurally guaranteed by React's JSX text-node escaping regardless — confirmed by reading `LabelWidget.tsx` directly rather than assuming. Full click-through still owed, same gap as the rest of Phase 10/11/12 per STATE.md.

## Next Phase Readiness

**Ready:** This was the last of Phase 12's 5 plans — the phase's code is now fully accounted for across `12-01` through `12-05` SUMMARYs (all written 2026-09-02, retroactively, via this UNIFY run).

**Concerns:** No live browser verification across any of Phase 12's 5 plans (see each SUMMARY's Deviations) — this is the standing gap STATE.md already tracks for Phase 10/11/12 together, not new to this plan.

**Blockers:** None.

---

_Completed: 2026-08-12 (SUMMARY written retroactively 2026-09-02)_
