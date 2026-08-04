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

## Addendum (2026-08-05, chat-driven continuation session)

On top of the 08-03 Miller-column redesign (chat follow-up, already narrated in `STATE.md`'s Decisions/Session Continuity — no separate `08-03-SUMMARY.md` was written for it), the same day's/next session's chat continued iterating directly on the Admin panel and the shared entity-list tables, entirely user-driven (no `/paul:discuss`/`/paul:plan`). Folded into this plan's summary per explicit user request rather than opened as a new numbered plan.

**Backend (`backend/`):**

- `PATCH /devices/:id` (label only) and `PATCH /customers/:id` (title only) added — `DevicesController`/`CustomersController` + `EntitiesService.updateDevice()`/`updateCustomer()` (same GET-then-POST-to-TB pattern as the existing `updateAsset()`). `CustomersController`'s PATCH is `@Roles('SYSADMIN')`-gated like its sibling create/delete routes. New DTOs: `UpdateDeviceDto`, `UpdateCustomerDto`.

**Frontend (`frontend/`):**

- **Edit UX overhaul**: inline row-editing (text input + check/cancel swapped into the table cell) was replaced everywhere with a shared `EditEntityDialog` (Radix `Dialog`-based modal, matching `ConfirmDialog`'s visual weight) — used by `EntityListWidget` (Assets: name+label, Devices: label, Clients: title→name) and by `AdminAssetPanel`'s own Edit action (name+label). Root cause for switching: HeroUI's `Table` caches each row's rendered JSX by the row *item's object identity* (`@react-stately/collections`' `CollectionBuilder`, a `WeakMap` keyed on the value passed via `items`), so a plain external state change (`editingId`) did not force the library to re-render the row — the Edit button visually "did nothing" even though state updated correctly. A modal sidesteps the bug entirely (no per-row conditional render inside the cached `<Table>`).
- **Add UX**: `AdminAssetPanel`'s inline "Add" form (text inputs appearing below the panel title) replaced with the same `Dialog` primitive (`Dialog`/`DialogHeader`/`DialogBody`/`DialogFooter` from `frontend/src/components/Dialog.tsx`), name+label fields, matching the Edit modal's shape.
- **Table scroll fix**: HeroUI `Table`'s `classNames` has two nested slots — an outer `base` div and an inner `wrapper` div (the actual scroll container). Only `wrapper` had `h-full`/`overflow-auto`; `base` had no height, so `h-full` on `wrapper` had nothing to resolve against (parent height was `auto`), the table grew to its full unclipped height, and the outer card's `overflow-hidden` silently clipped the bottom rows with no scrollbar at all. Fixed by also setting `base: 'h-full min-h-0'` in every affected `TABLE_CLASSNAMES` (`EntityListWidget`, `AlarmsListWidget`, `AdminAssetPanel`). A new `.table-scroll` CSS class (`globals.css`) gives all these tables a thin, light-gray, always-visible (not hover-only) draggable scrollbar — distinct from the pre-existing hover-only `.map-popup-scroll`.
- **Cursor pointer, app-wide**: added a global rule to `globals.css` (`button:not(:disabled), select:not(:disabled) { cursor: pointer }` + the `:disabled`/`not-allowed` counterpart) instead of hand-adding `cursor-pointer` to every button — browsers don't give `<button>`/`<select>` a pointer cursor by default, which is why roughly half the app's buttons already had a manual `cursor-pointer` class and half didn't.
- **Action-button restyle**: `EntityListWidget`'s Details/Edit/Delete row actions changed from filled color circles (`bg-navy-950`/`bg-red-600` circular buttons) to flat icon buttons (`rounded p-1 text-{color} hover:bg-surface`, no background at rest) per a user-supplied reference screenshot — now matches the flat icon-button convention already used in `AdminAssetPanel`/`AdminClientsColumn`/`AdminDevicePanel`.
- **Error toast restyle**: `providers.tsx`'s `sonner` `Toaster` `error` classNames gained a red-tinted background/border and red title text (previously just a thin left border), so error toasts read as visually distinct from success toasts at a glance.

**Key files touched this addendum:** `backend/src/devices/{devices.controller.ts,dto/update-device.dto.ts}`, `backend/src/customers/{customers.controller.ts,customers.service.ts,dto/update-customer.dto.ts}`, `backend/src/entities/entities.service.ts`; `frontend/src/widgets/{EntityListWidget.tsx,EditEntityDialog.tsx(new),AdminAssetPanel.tsx,AlarmsListWidget.tsx,AttributesTableWidget.tsx}`, `frontend/src/hooks/{usePatchDevice.ts(new),useCustomers.ts}`, `frontend/src/app/{assets,devices,clients}/page.tsx`, `frontend/src/app/providers.tsx`, `frontend/src/app/globals.css`.

**Verification:** `npx tsc --noEmit` clean in both `backend/` and `frontend/` after every change; dev server (Turbopack) hot-reload confirmed no compile errors. No automated browser check available in this environment (same standing limitation as every prior phase) — table-scroll and modal-open behavior were diagnosed by reading the `@react-stately/collections`/HeroUI `table.js` theme source directly (root-caused, not guessed) rather than via a live browser session; final interactive confirmation is the user's own.

**Not done / left as-is:** `AddAssetModal.tsx` remains unused dead code (flagged again, still not deleted). Customer's `PATCH` edits `title` only (ThingsBoard `Customer` has no native `label` field, confirmed via `TbCustomer` type — user explicitly chose to edit `title` instead when asked).

---
*Built with PAUL Framework · iot_app*
*Phase: 08-admin-hierarchy-panel, Plan: 02*
*Completed: 2026-08-04 (addendum: 2026-08-05)*
