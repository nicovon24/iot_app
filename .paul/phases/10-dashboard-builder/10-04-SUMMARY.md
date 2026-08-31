---
phase: 10-dashboard-builder
plan: 04
type: Summary
about: "iot-app"
---

# 10-04 Summary — Widget titles, click actions, time window (PARTIAL — written retroactively 2026-08-28)

**Status:** Partially applied, never completed. Only a slice of Task 1 and Task 3 landed in the codebase; Task 2 and the human-verify checkpoint never ran. Written now to close Phase 10's loop honestly rather than leave the plan silently stalled with no record of what actually shipped.

## What actually exists in the code (verified by grep, 2026-08-28)

- **Backend schema (part of Task 1):** `title`/`action` fields present in the shared widget shape (`backend/src/dashboards/widget-registry.ts:52-53`), with the documented comments describing their purpose. This part of Task 1 is real and matches the plan.
- **`timeWindow` column (part of Task 3):** `Dashboard.timeWindow Json?` exists in `backend/prisma/schema.prisma:71`, and `timeWindow?: Record<string, unknown>` exists in `backend/src/dashboards/dto/save-dashboard.dto.ts:81`. Nullable as planned (AC-4's back-compat requirement).

## What was never built

- **`frontend/src/dashboards/widget-actions.ts`** — does not exist. No `useWidgetAction` hook, no `WidgetAction` type.
- **`frontend/src/dashboards/TimeWindowPicker.tsx`** — does not exist. No preset selector, no custom-range UI, no `TimeWindowProvider` context.
- No widget (`EntityDataTableWidget`, `ValueCardsWidget`, `MultiValueTileWidget`, `EntityMapMarker`) has been wired for click-to-navigate — `useWidgetAction`/`config.title` have zero call sites anywhere in `frontend/src/dashboards/`.
- `use-widget-datasource.ts`'s `resolveHistoryWindow(timeWindow)` was never implemented — line charts still use the original hardcoded 1-hour window regardless of the (unused) `timeWindow` column.
- The Task 1 frontend half (title input + action Select in `AddWidgetPanel`, title rendering in `DashboardWidgetRenderer`) was never built — only the backend Zod fields exist.
- The blocking human-verify checkpoint was never reached, since the tasks gating it were incomplete.

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Custom title overrides generated one | Fail | Backend accepts the field; nothing in the UI sets or renders it |
| AC-2: Widget click action navigates | Fail | Not built at all |
| AC-3: Dashboard time window drives charts | Fail | Column exists but nothing reads or writes it end to end |
| AC-4: Time window survives unset value (back-compat) | Pass (vacuously) | Column is nullable and nothing depends on it yet, so no existing dashboard is broken — but this is because the feature was never wired up, not because back-compat was verified |
| AC-5: Invalid config rejected atomically | Untested | `title`/`action` Zod validation exists but no script/curl run confirmed the reject-overlong-title path from the plan's own verify steps |

## Why this happened (best available explanation)

No record exists of why this plan stalled mid-implementation — no SUMMARY, no STATE.md entry, no commit referencing 10-04. The two backend fields that do exist were most likely added as part of a later session's broader schema work (Phase 11's units/widgets touched `widget-registry.ts` extensively) rather than a dedicated 10-04 session. This is inference from the code, not a recovered decision record.

## Deferred / not done

- **Frontend implementation of Tasks 1–3 in full** — title UI, click-action wiring, time-window picker and the context/resolver plumbing. If picked back up, treat this as a fresh plan rather than resuming 10-04's original task list, since the codebase has moved on significantly since 2026-08-05 (Phase 11 units/widgets, the editorial rebrand) and the original plan's file-level details may no longer match current code.
- The human-verify checkpoint, unreached.
- Real browser click-through of the whole dashboard builder — still the same standing item from 10-01/10-02/10-03.

---

**Phase 10 close-out note:** 10-01/10-02/10-03 are code-complete and each individually verified (curl for 10-01, `tsc`/`next build`/dev-server checks for 10-02/10-03 — no live browser click-through for any of them). 10-04 is the exception: only a fragment of its backend surface exists, its frontend was never built, and its own blocking checkpoint was never satisfied. Phase 10 is being closed with 10-01/02/03 as its real deliverable; 10-04's remaining scope (title/action/time-window UI) is carried forward as a deferred item rather than kept open as an active, unfinished plan.
