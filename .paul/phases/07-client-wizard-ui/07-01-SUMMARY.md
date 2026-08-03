---
phase: 07-client-wizard-ui
plan: 01
subsystem: ui
tags: [wizard, forms, react-hook-form, zod, customers]

requires:
  - phase: 04-client-wizard-hierarchy
    provides: POST /customers, GET /customers/:id/hierarchy (atomic Customer+hierarchy creation, sysadmin-only)
  - phase: 06-entity-views
    provides: EntityListWidget, useEntities (generic list hook)
provides:
  - Real Clients list at /clients (replaces comingSoon placeholder)
  - 3-step Client creation wizard at /clients/new (info -> hierarchy -> review), wired to POST /customers
  - useCustomers()/useCreateCustomer() hooks, CreateCustomerRequest/HierarchyLevel types
  - react-hook-form + zod + @hookform/resolvers now in frontend stack
affects: []

tech-stack:
  added: [react-hook-form@^7.54.2, zod@^3.24.1, "@hookform/resolvers@^3.9.1"]
  patterns:
    - "useEntities widened from Extract<EntityType,'DEVICE'|'ASSET'> to include 'CUSTOMER' — one generic list hook now backs /devices, /assets, and /clients, no per-entity duplicate hooks"
    - "Wizard step state is local useState<1|2|3>, not routing — single page, react-hook-form's trigger() gates Next per step"
    - "No client-side sysadmin role gating — the app has no /auth/me-equivalent endpoint exposing the caller's role, so the wizard is visible to any session and real enforcement stays server-side (RolesGuard); a 403 surfaces via the existing ApiError -> inline banner pattern"

key-files:
  created:
    - frontend/src/types/customer.ts
    - frontend/src/hooks/useCustomers.ts
    - frontend/src/app/clients/page.tsx
    - frontend/src/app/clients/new/page.tsx
    - frontend/src/widgets/ClientWizard.tsx
  modified:
    - frontend/package.json
    - frontend/src/hooks/useEntities.ts
    - frontend/src/lib/nav-items.ts

key-decisions:
  - "react-hook-form/zod/@hookform/resolvers added this plan — ROADMAP.md previously claimed they were 'already in stack', confirmed false by checking frontend/package.json before starting"
  - "Hierarchy level reordering uses useFieldArray's swap() via up/down buttons, not drag-and-drop — kept simple per plan scope, no new dependency"
  - "levelIndex is derived from array position at submit time (map((l,i) => ({levelIndex: i, name: l.name}))), never stored as separate form state — avoids index drift when levels are added/removed/reordered"
  - "Review step's error banner uses Tailwind's default red-50/red-200/red-700 palette (matching AlarmsListWidget's existing SeverityChip pattern) instead of the custom danger token with an opacity modifier (danger/10) — the legacy tailwind.config.ts bridge (Phase 5 decision) defines danger as a plain hex CSS var, which doesn't reliably support Tailwind's slash-opacity syntax"

duration: ~25min
started: 2026-08-03T00:00:00Z
completed: 2026-08-03T00:00:00Z
description: "Clients list page + 3-step Client creation wizard (info -> hierarchy -> review), wired to the existing POST /customers backend"
type: Summary
about: "iot-app"
---

# Phase 7 Plan 01: Client Wizard UI Summary

**`/clients` is now a real list of ThingsBoard Customers, and `/clients/new` is a 3-step wizard (info, ordered hierarchy, review) that creates a real Customer + hierarchy atomically via the existing Phase 4 backend — no backend changes needed.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Clients list shows real Customers | Pass | `/clients` uses `useCustomers()` (= widened `useEntities('CUSTOMER')`) + `EntityListWidget`; verified live — `GET /customers` returns real data (`Test`, plus a verification Customer created this session), page returns 200 |
| AC-2: Wizard collects basic info and an ordered hierarchy | Pass | Step 1 requires non-empty `name` (Zod + RHF `trigger`), Step 2 pre-fills Site/Area/Asset/Sensor via `useFieldArray`, blocks progression below 1 level (`ArrayMinSize(1)` mirrored client-side), add/remove/reorder all wired |
| AC-3: Review step makes immutability explicit | Pass | Step 3 renders a summary (name + ordered levels) plus a visible warning banner stating the hierarchy cannot be changed after creation |
| AC-4: Submit creates a real Customer + hierarchy | Pass | Verified live: `POST /customers` with `{name, hierarchyLevels}` (no `parentCustomerId`) created a real Customer "Verify Client 07-01" with Site/Area levels; `GET /customers/:id/hierarchy` confirmed both levels in order; `GET /customers` list count went 1 -> 2 |
| AC-5: Backend errors surface clearly | Pass (by code review; no 403/400 case hit live) | `onSubmit` reads `createCustomer.error instanceof ApiError ? error.message : 'Unknown error'` into a visible inline banner in Step 3, mutation stays failed (not swallowed) — matches `EntityListWidget`/`AlarmsListWidget`'s existing error-display pattern. Not independently triggered against a real 403/400 this session (would need a non-sysadmin session, which has a known-broken test account per STATE.md Deferred Issues) |

## Accomplishments

- Closed V1's last core requirement gap: "Client creation wizard... the only wizard in V1" (PROJECT.md) is now real end-to-end
- `useEntities`'s widening to include `CUSTOMER` means `/clients` needed zero new list-fetching logic — same hook, same widget, same pattern as `/devices`/`/assets`
- Confirmed live that ThingsBoard's Professional Edition trial no longer blocks Customer creation (STATE.md's "CRITICAL — TB Cloud PE trial expired" blocker from Phase 4.3/6 sessions did not reproduce — `POST /customers` succeeded normally)

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `frontend/package.json` | Modified | Added `react-hook-form`, `zod`, `@hookform/resolvers` |
| `frontend/src/types/customer.ts` | Created | `HierarchyLevel`, `CreateCustomerRequest` types mirroring backend DTO |
| `frontend/src/hooks/useEntities.ts` | Modified | Widened to support `CUSTOMER` alongside `DEVICE`/`ASSET` |
| `frontend/src/hooks/useCustomers.ts` | Created | `useCustomers()` (list), `useCreateCustomer()` (mutation + cache invalidation) |
| `frontend/src/app/clients/page.tsx` | Created | Real Clients list, replaces `comingSoon` placeholder |
| `frontend/src/app/clients/new/page.tsx` | Created | Thin wrapper page for the wizard |
| `frontend/src/widgets/ClientWizard.tsx` | Created | 3-step wizard: info, hierarchy, review+submit |
| `frontend/src/lib/nav-items.ts` | Modified | "Clients" nav item's `comingSoon: true` removed |

## Verification Method

No headless-browser tool available in this environment (same constraint as every prior phase). Verified via:
- `npx tsc --noEmit` — clean after every task
- Direct `curl` calls against the real backend (real session token from real ThingsBoard Cloud login) confirming `GET /customers` initial state, then a real `POST /customers` matching the wizard's exact submit payload shape, then `GET /customers/:id/hierarchy` and `GET /customers` re-fetch to confirm the full round-trip
- `curl` against the Next.js dev server confirming `/clients` and `/clients/new` render (200)
- Final interactive visual/click-through confirmation (wizard step transitions, reorder buttons, error banner) deferred to the user's own browser check

## Deviations from Plan

None. All 3 tasks executed as specified. One tooling snag handled inline: `npm install` at repo root initially failed with `EPERM` on `query_engine-windows.dll.node` because the backend dev server (holding the file open) was still running from the prior session — stopped the process, reinstalled successfully, restarted the backend.

## Next Phase Readiness

**Ready:**
- Phase 7's Client-wizard half is complete; Plan 07-02 (Add Asset flow) can proceed — it depends on this plan's `useCustomers()` hook, now available
- `react-hook-form`/`zod`/`@hookform/resolvers` are installed and the Zod-schema + `useFieldArray` pattern established here is directly reusable for 07-02's Asset form

**Concerns:**
- Same as every prior phase: no automated browser/screenshot verification tool in this environment — interactive wizard flow (step navigation, reorder buttons) not independently confirmed
- AC-5 (403/400 error surfacing) verified by code review only, not against a live failing request — the known-broken non-sysadmin test account (STATE.md Deferred Issues) blocks an easy live 403 check

**Blockers:** None. Plan 07-02 can proceed.

---
*Built with PAUL Framework · iot_app*
*Phase: 07-client-wizard-ui, Plan: 01*
*Completed: 2026-08-03*
