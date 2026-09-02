---
phase: 12-units-and-widgets
plan: 02
subsystem: ui
tags: [units, dashboards, widget-config, radix-select]

requires:
  - phase: 12-units-and-widgets
    provides: "12-01's unit catalog (resolveUnit/suggestUnit/UNIT_CATEGORIES) and unit/decimals on the shared presentation schema"
provides:
  - Catalog-backed UnitPicker component with a Custom… free-text fallback
  - Select.tsx grouped-option support (additive, backward compatible)
  - Unit field shown on every telemetryKey !== 'none' widget, not a hardcoded 5-type list
  - Auto-suggest-unit-on-key-pick, gated by an untouched/unedited flag
affects: [12-04-multi-key-units]

tech-stack:
  added: []
  patterns:
    - "Select.tsx's group?: string is additive-only — ungrouped callers render exactly as before"
    - 'unitTouched flag: auto-suggestion only fires once per widget instance, never overwrites a manual pick or an edit-seeded value'

key-files:
  created: [frontend/src/components/dashboards/widget-config/pickers/UnitPicker.tsx]
  modified:
    - frontend/src/components/ui/Select.tsx
    - frontend/src/components/dashboards/widget-config/widget-registry.tsx
    - frontend/src/components/dashboards/widget-config/AddWidgetPanel/ConfigureStep.tsx
    - frontend/src/components/dashboards/widget-config/AddWidgetPanel/index.tsx

key-decisions:
  - "Unit picker visibility keyed on meta.telemetryKey !== 'none' (a property every widget's registry entry already declares), replacing the old SCALE_TYPES/UNIT_ONLY_TYPES hardcoded lists"
  - 'isCustom = forcedCustom || (value is set and not a catalog symbol) — a free-text unit saved before this plan opens directly into Custom mode with its text intact, no blank/error state'

patterns-established:
  - 'SCALE_TYPES exported once from widget-registry.tsx, imported by both ConfigureStep and AddWidgetPanel/index — no more declaring the same widget-type list twice'

duration: unknown (applied 2026-08-12, unify run retroactively 2026-09-02)
started: 2026-08-12
completed: 2026-08-12
description: 'Catalog-backed unit picker with grouped options + Custom… fallback, replacing the free-text unit input on 5 hardcoded widget types'
type: Summary
about: 'iot-app'
---

# Phase 12 Plan 02: Unit picker in the config panel Summary

**The widget config panel's unit field is now a catalog-backed picker grouped by category, shown on every value-rendering widget type instead of 5 hardcoded ones, with auto-suggestion that never clobbers a deliberate or edit-seeded choice.**

Written retroactively 2026-09-02 via `/paul:unify`, verified against the current codebase (files read directly, not recalled from session memory — the plan was applied 2026-08-12).

## Acceptance Criteria Results

| Criterion                                                                 | Status | Notes                                                                                                                                                                                   |
| ------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1: Unit picker replaces free-text input, offers catalog + custom       | Pass   | `UnitPicker.tsx`: `OPTIONS = [...CATALOG_OPTIONS, {value: '__custom__', label: 'Custom…'}]`, grouped via `Select.tsx`'s new `group?` field                                              |
| AC-2: Unit field on every value-rendering widget, not just 5              | Pass   | `ConfigureStep.tsx:185` — `meta.telemetryKey !== 'none' && !SCALE_TYPES.includes(widgetType)` gates the picker                                                                          |
| AC-3: Auto-suggestion doesn't clobber a deliberate choice                 | Pass   | `AddWidgetPanel/index.tsx:488` — `if (!unitTouched && key) setUnit(suggestUnit(key) ?? '')`; edit-seeding sets `unitTouched = true` unconditionally (comment at line 168 documents why) |
| AC-4: Back-compat — free-text units saved before this plan open correctly | Pass   | `UnitPicker.tsx:47` — `isCustom = forcedCustom \|\| (value set && not a catalog symbol)` — a non-catalog saved unit opens directly in Custom mode with its text preserved               |

## Files Created/Modified

| File                                                                      | Change   | Purpose                                                                                                                    |
| ------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/dashboards/widget-config/pickers/UnitPicker.tsx` | Created  | Grouped catalog picker + Custom… escape hatch + decimals input                                                             |
| `frontend/src/components/ui/Select.tsx`                                   | Modified | `SelectOption.group?: string`, renders `Select.Group`/`Select.Label` when present                                          |
| `frontend/src/components/dashboards/widget-config/widget-registry.tsx`    | Modified | `SCALE_TYPES` now exported here (single source)                                                                            |
| `ConfigureStep.tsx`                                                       | Modified | `UNIT_ONLY_TYPES` removed, unit picker gated on `telemetryKey !== 'none'`, scatter's x/y unit inputs also use `UnitPicker` |
| `AddWidgetPanel/index.tsx`                                                | Modified | `decimals`/`unitTouched` state, auto-suggest wiring, edit-seed sets `unitTouched=true`                                     |

## Deviations from Plan

**Path difference (not functional):** the plan specified `frontend/src/dashboards/widget-config/UnitPicker.tsx`; the actual file lives at `frontend/src/components/dashboards/widget-config/pickers/UnitPicker.tsx` (the whole `dashboards/` tree was later reorganized under `components/`, and a `pickers/` subfolder was introduced — consistent with 12-01's `units.ts` path move). No functional gap — every export/prop the plan specified is present.

**Verification method:** the plan's manual click-through steps (auto-suggest, custom mode, editing back-compat) were not re-run live in this retroactive UNIFY — code inspection confirms the exact logic branches the plan's acceptance criteria describe (`unitTouched` guard, `isCustom` derivation). A live click-through is still owed, tracked in STATE.md's "Next action" alongside Phase 10/11/12's other unverified UI.

## Next Phase Readiness

**Ready:** 12-04 (multi-key units) can reuse `UnitPicker` per-key.

**Concerns:** No live browser verification yet (see Deviations) — same gap as the rest of Phase 10/11/12's UI per STATE.md.

**Blockers:** None.

---

_Completed: 2026-08-12 (SUMMARY written retroactively 2026-09-02)_
