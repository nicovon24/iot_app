---
phase: 07-client-wizard-ui
plan: 02
subsystem: ui
tags: [assets, modal, react-hook-form, zod, hierarchy]

requires:
  - phase: 07-client-wizard-ui
    provides: "useCustomers() hook (Plan 07-01)"
  - phase: 4.3-asset-hierarchy-linking
    provides: "POST /assets (customerId+levelIndex+parentId, real TB Contains relation)"
provides:
  - "Add Asset" modal on /assets: pick Client -> hierarchy level -> parent (Customer or existing Asset) -> create
  - useCustomerHierarchy(customerId), useCreateAsset() hooks, CreateAssetRequest type
affects: []

tech-stack:
  added: []
  patterns:
    - "Level-0 parent is implicit (parentId = customerId, no separate control); level 1+ parent is a Select populated by client-filtering useEntities('ASSET') on customerId === selected Client — matches exactly what POST /assets validates against, no generic recursive picker built"
    - "useCustomerHierarchy is enabled: !!customerId — doesn't fetch until a Client is picked, avoiding a wasted request with an undefined id"

key-files:
  created:
    - frontend/src/types/asset.ts
    - frontend/src/hooks/useCustomerHierarchy.ts
    - frontend/src/hooks/useCreateAsset.ts
    - frontend/src/widgets/AddAssetModal.tsx
  modified:
    - frontend/src/app/assets/page.tsx

key-decisions:
  - "Submit is disabled (canSubmit) when levelIndex > 0 and no existing Asset exists yet under the selected Client, with an inline message telling the user to create a level-0 Asset first — the backend has no fallback for a missing parent (AssetHierarchyAssignment validation requires a real parent), so blocking client-side avoids a guaranteed 400/404"

duration: ~20min
started: 2026-08-03T00:00:00Z
completed: 2026-08-03T00:00:00Z
description: "Add-Asset modal on /assets: Client -> hierarchy level -> parent picker, wired to the existing POST /assets backend"
type: Summary
about: "iot-app"
---

# Phase 7 Plan 02: Add Asset Flow Summary

**`/assets` now has an "Add Asset" action opening a modal that walks Client -> hierarchy level -> parent (Customer for level 0, existing Asset for level 1+) -> name/type/label, creating a real linked Asset via the existing Phase 4.3 backend — no backend changes.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Add Asset entry point is discoverable | Pass | `/assets` gained an "Add Asset" button (same `bg-accent` visual weight as 07-01's "Create Client"), opening `AddAssetModal` |
| AC-2: Customer + level + parent selection is constrained to real data | Pass | Client `Select` from `useCustomers()`; level `Select` from `useCustomerHierarchy(customerId)` (real `GET /customers/:id/hierarchy`, `enabled` gated on a Client being picked); parent is implicit Customer for level 0, or a `Select` of real Assets client-filtered by `customerId` for level 1+ — verified live with a real 2-level hierarchy |
| AC-3: Submit creates a real linked Asset | Pass | Verified live: `POST /assets` created a real level-0 Asset (parent = Customer) and a real level-1 Asset (parent = the level-0 Asset); `GET /assets` confirmed both listed under the correct Customer after creation |
| AC-4: Validation errors surface clearly | Pass (by code review; no live 400/403 hit) | Same `ApiError`-based inline banner pattern as 07-01; additionally, submit is client-side disabled (not just error-handled) when level 1+ has no available parent Asset, preventing a guaranteed-invalid request rather than just displaying its error after the fact |

## Accomplishments

- Combined with 07-01, an admin can now create a Client (with hierarchy) and its Assets entirely from the frontend — closing the scope the user asked for this session, with Devices correctly and explicitly excluded (no backend support, confirmed deferred to V2)
- Confirmed live a real, previously-undocumented TB behavior: a freshly created Asset's own creation-response `customerId` briefly shows TB's `NULL_UUID` placeholder before the owner-reassignment step is reflected — a follow-up `GET /assets/:id` shows the correct real Customer. Not a bug in this plan's code (no backend changes), consistent with the `AssetsService.create()` TB-then-Postgres sequencing from Phase 4.3; noted here for future reference rather than as new work
- No new backend endpoints or schema needed — pure frontend composition of the existing `POST /assets` contract, same "no backend changes" pattern as Phase 6.5 and 07-01

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `frontend/src/types/asset.ts` | Created | `CreateAssetRequest` type mirroring backend DTO |
| `frontend/src/hooks/useCustomerHierarchy.ts` | Created | Reads a Customer's real ordered hierarchy levels |
| `frontend/src/hooks/useCreateAsset.ts` | Created | Mutation wrapping `POST /assets` + cache invalidation |
| `frontend/src/widgets/AddAssetModal.tsx` | Created | The full Add-Asset form/modal |
| `frontend/src/app/assets/page.tsx` | Modified | Added the "Add Asset" button + modal wiring |

## Verification Method

No headless-browser tool available in this environment (same constraint as every prior phase). Verified via:
- `npx tsc --noEmit` — clean after every task
- Direct `curl` calls against the real backend (real ThingsBoard Cloud session) reproducing the modal's exact two paths: a level-0 Asset (`parentId = customerId`) and a level-1 Asset (`parentId` = the just-created level-0 Asset's id) — both succeeded, both confirmed via `GET /assets`/`GET /assets/:id` showing correct final `customerId`
- Final interactive visual/click-through confirmation (Select cascading behavior, disabled-submit state) deferred to the user's own browser check

## Deviations from Plan

None. Both tasks executed as specified.

## Next Phase Readiness

**Ready:**
- Phase 7 (final V1 phase) is functionally complete: Client creation wizard (07-01) + Asset creation flow (07-02), both verified against real ThingsBoard Cloud data, zero backend changes
- V1's core requirement ("Client creation wizard... the only wizard in V1" plus the user's mid-session request for Asset creation) is satisfied

**Concerns:**
- Same as every prior phase: no automated browser/screenshot verification tool — interactive modal behavior (Select cascading, disabled states) not independently confirmed in a real browser
- Devices remain read-only by explicit design (Phase 4.3) and explicit user decision this session — no UI or backend work attempted for Device creation/linking, correctly deferred to V2

**Blockers:** None. Ready for `/paul:unify` to close Phase 7 and transition PROJECT.md/ROADMAP.md/STATE.md.

---
*Built with PAUL Framework · iot_app*
*Phase: 07-client-wizard-ui, Plan: 02*
*Completed: 2026-08-03*
