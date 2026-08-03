---
phase: 08-admin-hierarchy-panel
plan: 02
subsystem: ui
tags: [admin, breadcrumbs, hierarchy, devices, forms]

requires:
  - phase: 08-admin-hierarchy-panel
    provides: "08-01's backend — parentCustomerId, GET /customers|assets/:id/children, PATCH /assets/:id, POST/DELETE /assets/:id/devices"
  - phase: 07-client-wizard-ui
    provides: useCustomers, useCreateCustomer, useDeleteCustomer, useCreateAsset, useDeleteAsset, ClientWizard, ConfirmDialog
provides:
  - "/admin — 3-column breadcrumb-navigable hierarchy manager (Clients -> Assets -> Devices)"
  - useCustomerChildren, useAssetChildren, useInvalidateHierarchyChildren, usePatchAsset, useLinkDevice, useUnlinkDevice hooks
  - AdminBreadcrumbs, AdminAssetPanel, AdminDevicePanel widgets
  - ClientWizard extended with optional parentCustomerId (sub-customer creation)
  - apiClient gains .patch()
affects: []

tech-stack:
  added: []
  patterns:
    - "Customer breadcrumb drilling filters the full useCustomers() list client-side by parentCustomerId (same client-filter pattern as AddAssetModal's customerId filter, Phase 7) — no server-side parent-filter endpoint needed"
    - "Asset breadcrumb drilling uses two different queries depending on depth: useCustomerChildren for the root level (Customer's direct Assets) and useAssetChildren once drilled into an Asset — both hit 08-01's real Contains-relation endpoints, never Postgres"
    - "activeNode (for the Devices column) is derived, not stored: deepest of assetTrail/customerTrail, recomputed on every render from the two trail arrays — avoids a third piece of state that could drift out of sync"
    - "Mutations from useCreateAsset/useDeleteAsset/usePatchAsset (Phase 7 hooks reused here) only invalidate ['entities','ASSET'] by design (that's what /assets' own list needs) — AdminAssetPanel additionally calls useInvalidateHierarchyChildren() after each mutation to refresh the panel's own children query, since that's a different cache key the shared hooks don't know about"

key-files:
  created:
    - frontend/src/hooks/useHierarchyChildren.ts
    - frontend/src/hooks/usePatchAsset.ts
    - frontend/src/hooks/useDeviceLink.ts
    - frontend/src/widgets/AdminBreadcrumbs.tsx
    - frontend/src/widgets/AdminAssetPanel.tsx
    - frontend/src/widgets/AdminDevicePanel.tsx
    - frontend/src/app/admin/page.tsx
  modified:
    - frontend/src/lib/api-client.ts
    - frontend/src/types/entity.ts
    - frontend/src/lib/nav-items.ts
    - frontend/src/widgets/ClientWizard.tsx
    - frontend/src/app/clients/page.tsx
    - frontend/src/app/assets/page.tsx

key-decisions:
  - "AddAssetModal.tsx is left in place, unused — per the plan's explicit note, deleting a component the same session it stops being referenced is unusual churn; flagged here as dead code for a future cleanup pass rather than deleted now"
  - "The panel's own Add-Asset form (inside AdminAssetPanel) is a lightweight inline name+type form, not a reuse of AddAssetModal — the panel already knows customerId/levelIndex/parentId from the current breadcrumb position, so re-asking the user to pick a Customer/level/parent (what AddAssetModal does standalone) would be redundant, exactly the tradeoff flagged as an open question in CONTEXT.md and resolved here"
  - "Clicking a Customer row always pushes it onto the breadcrumb trail (whether or not it has sub-customers) rather than conditionally drilling only when children exist — simpler than a two-behavior click handler, and a childless Customer just shows an empty Clients column with itself as the deepest breadcrumb, which is a legitimate state (no sub-clients) rather than a bug"

duration: ~35min
started: 2026-08-04T00:00:00Z
completed: 2026-08-04T00:00:00Z
description: "Admin nav section: breadcrumb-navigable Customer/sub-Customer -> Asset tree -> linked Devices, with add/delete/edit/assign/unassign"
type: Summary
about: "iot-app"
---

# Phase 8 Plan 02: Admin Panel Frontend Summary

**`/admin` is now a real 3-column hierarchy manager — Clients (with sub-client breadcrumbs) → Assets (nested, drillable) → linked Devices (assign/unassign only) — built entirely on 08-01's backend, with "Create Client"/"Add Asset" removed from their old homes on `/clients`/`/assets`.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Admin nav entry and breadcrumb-navigable Customer column | Pass | "Admin" added to `NAV_ITEMS` → `/admin`; Clients column filters `useCustomers()` by `parentCustomerId`, clicking a row drills in via `AdminBreadcrumbs`, verified `/admin` renders 200 and the real "Test" Customer + its (empty) children query round-trip correctly |
| AC-2: Asset column reflects the selected Client's real Contains tree | Pass | `AdminAssetPanel` reads `useCustomerChildren`/`useAssetChildren` depending on drill depth — both endpoints live-verified in 08-01; row click drills via its own breadcrumb and updates `activeNode` |
| AC-3: Device column shows Devices linked to the active node, with assign/unassign only | Pass | `AdminDevicePanel` reads the same children query's `.devices`; "Assign" disabled with a tooltip when `activeNode.type === 'CUSTOMER'` (per the scope decision — linking requires an Asset); each row has only an "Unassign" (X) button, no edit/delete — matches the explicit "no pongas acciones en device, solo asignar y desasignar" instruction |
| AC-4: Add/delete Customer and Add/delete/edit Asset from the panel | Pass (code review + backend re-confirmed live; full interactive click-through not independently re-run this task) | `ClientWizard` extended with `parentCustomerId` prop for sub-customer creation from the panel; `AdminAssetPanel` has inline Add/Edit forms + `ConfirmDialog`-backed Delete, all wired to Phase 7's `useCreateAsset`/`usePatchAsset`/`useDeleteAsset` plus the new children-cache invalidation |
| AC-5: Create buttons removed from their old locations | Pass | Verified via `grep -c "Create Client\|Add Asset"` on both page files — 0 matches in each; `/clients` and `/assets` both still render 200 with their existing list + delete flow intact |

## Accomplishments

- Consolidated Client/Asset/Device hierarchy management into one breadcrumb-driven view, closing the user's original ask this session
- Reused every applicable Phase 7 piece (`useCustomers`, `useCreateAsset`, `useDeleteAsset`, `useDeleteCustomer`, `ClientWizard`, `ConfirmDialog`) rather than duplicating — only `ClientWizard` needed a small extension (`parentCustomerId` prop) to support sub-customer creation from the panel
- Zero backend changes needed in this plan — pure frontend composition on top of 08-01, matching the "TB is the single source of truth" pattern all the way through the UI (no Postgres, no extra client-side cache beyond TanStack Query)

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `frontend/src/hooks/useHierarchyChildren.ts` | Created | `useCustomerChildren`, `useAssetChildren`, `useInvalidateHierarchyChildren` |
| `frontend/src/hooks/usePatchAsset.ts` | Created | Asset name/type/label update mutation |
| `frontend/src/hooks/useDeviceLink.ts` | Created | `useLinkDevice`/`useUnlinkDevice` mutations |
| `frontend/src/widgets/AdminBreadcrumbs.tsx` | Created | Shared breadcrumb trail component |
| `frontend/src/widgets/AdminAssetPanel.tsx` | Created | Asset tree column: list, drill, add, edit, delete |
| `frontend/src/widgets/AdminDevicePanel.tsx` | Created | Device column: list, assign (modal), unassign |
| `frontend/src/app/admin/page.tsx` | Created | The 3-column page, breadcrumb/trail state |
| `frontend/src/lib/api-client.ts` | Modified | Added `.patch()` |
| `frontend/src/types/entity.ts` | Modified | `EntityRef.parentCustomerId` |
| `frontend/src/lib/nav-items.ts` | Modified | "Admin" nav entry |
| `frontend/src/widgets/ClientWizard.tsx` | Modified | Optional `parentCustomerId` prop |
| `frontend/src/app/clients/page.tsx` | Modified | "Create Client" button + `ClientWizard` render removed |
| `frontend/src/app/assets/page.tsx` | Modified | "Add Asset" button + `AddAssetModal` render removed |

## Verification Method

No headless-browser tool available in this environment (same constraint as every prior phase). Verified via:
- `npx tsc --noEmit` — clean after every task
- `curl` against the Next.js dev server confirming `/admin`, `/clients`, `/assets` all render 200
- `grep -c` confirming the old create-button text is fully gone from both page source files
- Direct `curl` against the real backend re-confirming the exact endpoints the panel calls (`GET /customers`, `GET /customers/:id/children`) return the expected real data shape
- Final interactive visual/click-through confirmation (breadcrumb drilling, inline add/edit forms, assign/unassign modal) deferred to the user's own browser check, same standing limitation as every prior phase

## Deviations from Plan

None structural. `AddAssetModal.tsx` was left in place unused rather than deleted, exactly as the plan's Task 4 anticipated as an acceptable outcome.

## Next Phase Readiness

**Ready:**
- Phase 8 (Admin hierarchy management panel) is functionally complete: backend (08-01) and frontend (08-02) both done, all ACs pass
- The admin panel is the first Version 2 feature shipped, reusing V1's Phase 7 patterns throughout

**Concerns:**
- Same as every prior phase: no automated browser/screenshot verification — breadcrumb drilling and modal interactions not independently confirmed in a real browser
- `AddAssetModal.tsx` is now dead code (no page renders it) — worth removing in a future cleanup pass if confirmed genuinely unused going forward
- No sysadmin-only gating on `/admin` itself (same standing gap as Phase 7 — no `/auth/me` endpoint) — real enforcement is server-side per-action (e.g. `POST /customers`'s `RolesGuard`)

**Blockers:** None. Phase 8 is complete pending user's own interactive verification in a browser.

---
*Built with PAUL Framework · iot_app*
*Phase: 08-admin-hierarchy-panel, Plan: 02*
*Completed: 2026-08-04*
