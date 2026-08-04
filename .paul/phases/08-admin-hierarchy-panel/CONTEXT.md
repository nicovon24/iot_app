---
phase: 08-admin-hierarchy-panel
type: Context
about: "iot-app"
---

# Phase 8 Discussion: Admin hierarchy management panel (V2)

## Goals

User asked (chat session, 2026-08-03/04, after V1 shipped) to:
1. Remove the "Create Client" button from `/clients` and the "Add Asset" button from `/assets`.
2. Build a new **Admin** section with a full hierarchy browser: Customers (with breadcrumb navigation into sub-clients) → their Assets (nested tree, drill-down) → real ThingsBoard Devices assigned to the selected Asset — all scoped to whichever Client/sub-client is currently selected.
3. From this admin view: add/delete Customers, add/delete/edit Assets, and **assign/unassign** real Devices to the last (deepest-selected) element of the hierarchy.

Reference: user shared a screenshot mockup (3-column layout: Customers | Activos | Dispositivos asignados) as visual inspiration, not a literal spec.

## Scope decisions (confirmed with user via clarifying questions)

- **Devices are real ThingsBoard Devices**, not just the "Sensor"-named leaf level of the Customer hierarchy — confirmed explicitly. This required new backend work (no Device↔Asset relation existed before this phase; Device creation/linking had been deliberately deferred to V2 back in Phase 4.3).
- **Admin is a new nav section**, not a replacement for `/clients`/`/assets` — those pages keep existing (list + row actions), just lose their "create" entry points per item 1 above.
- **Editing is Asset-only** (name/type/label via a new `PATCH /assets/:id`). Customer hierarchy stays immutable after creation — no change to that Phase 4 decision.
- **Device row actions are assign/unassign only** — explicitly no edit, no delete-the-real-device action. "Unassign" removes the TB relation only; the Device itself is never touched (still fully read-only elsewhere in the app, per the Phase 4.3 decision that `POST /devices`/`DELETE /devices` don't exist).
- A Device is assigned by creating a real TB "Contains" relation from **whatever node is currently the deepest-selected element** in the admin panel's Asset drill-down (a Customer if no Asset is selected yet, otherwise the selected Asset) — not hardcoded to "the last hierarchy level by name".

## Backend work — DONE this session (not yet runtime-verified against real ThingsBoard)

All in `backend/src/`, no Postgres schema changes (relations are pure ThingsBoard state, consistent with the project's "TB is the single source of truth" constraint):

- `types/entities.types.ts`: `EntityRef` gains `parentCustomerId?: EntityRefLink` (CUSTOMER only) — powers sub-client breadcrumbs.
- `entities/entities.service.ts`:
  - `toEntityRefs`/`collectRefs` updated to resolve+enrich `parentCustomerId` the same batched/cached way as `customerId`/`tenantId`.
  - `createRelation()` widened: `toType` now `'ASSET' | 'DEVICE'` (was `'ASSET'` only).
  - `deleteRelation(fromId, 'ASSET', toId, 'DEVICE')` — new, removes a Contains relation (unlink, never deletes either entity).
  - `updateAsset(id, {name?, type?, label?})` — new, TB upsert-style update via `POST /api/asset` with existing fields merged in.
  - `getRelationChildren(fromId, fromType: 'CUSTOMER'|'ASSET')` — new, queries TB's real Relations API (`GET /api/relations`), filters `type === 'Contains'`, splits results into `{assets, devices}` by `to.entityType`. This is what powers the tree drill-down (Customer→level-0 Assets, Asset→child Assets/Devices) — no Postgres involved, matches TB as source of truth.
- `assets/assets.service.ts`:
  - `delete()` now **blocked** if the Asset has any children (child Assets or linked Devices via `getRelationChildren`) — same integrity guard pattern as `CustomersService.delete()`'s Asset-count check.
  - `update()`, `linkDevice()`, `unlinkDevice()` — new, thin wrappers over the `EntitiesService` methods above.
- `assets/assets.controller.ts`: new `PATCH /assets/:id`, `GET /assets/:id/children`, `POST /assets/:id/devices` (`{deviceId}` body), `DELETE /assets/:id/devices/:deviceId`.
- `customers/customers.controller.ts`: new `GET /customers/:id/children` (level-0 Assets attached directly to a Customer).
- New DTOs: `assets/dto/update-asset.dto.ts`, `assets/dto/link-device.dto.ts`.

`npx tsc --noEmit` passes clean in `backend/`. **Not yet runtime-verified live** — was mid-verification (about to curl the new endpoints against real ThingsBoard Cloud) when this session paused to write up this summary instead.

## Frontend work — NOT STARTED

Still to build, all in `frontend/src/`:

1. Remove "Create Client" button from `frontend/src/app/clients/page.tsx` and "Add Asset" button from `frontend/src/app/assets/page.tsx` (keep the pages otherwise as-is — list + existing row actions).
2. New nav item "Admin" in `frontend/src/lib/nav-items.ts` → new route `frontend/src/app/admin/page.tsx`.
3. Customers column: breadcrumb-navigable list using the existing `useCustomers()` hook (Phase 7) filtered client-side by `parentCustomerId` (root = no `parentCustomerId`; drilling in = filter to `parentCustomerId === selected.id`), mirroring the client-filter pattern already used in `AddAssetModal` for Assets-by-customer. Add/delete Customer actions here (reuse `useCreateCustomer`/`useDeleteCustomer` from Phase 7, `ClientWizard`/`ConfirmDialog` widgets).
4. Assets column: breadcrumb-navigable nested tree scoped to the currently-selected Customer/sub-Customer, using the new `GET /customers/:id/children` (root Assets) and `GET /assets/:id/children` (drill into an Asset's own children) endpoints — needs new `useCustomerChildren(customerId)`/`useAssetChildren(assetId)` hooks. Add (reuse existing `POST /assets` flow, adapted to this panel's selected-parent context instead of `AddAssetModal`'s standalone Customer/level/parent pickers), delete (existing `useDeleteAsset`), and a new edit action (new `usePatchAsset()` hook wired to `PATCH /assets/:id`, probably a small inline-edit or reused-modal pattern).
5. Devices column: real Devices linked to the deepest-selected node (Customer if nothing drilled into yet, else the selected Asset) via the relations already returned by the children endpoints' `devices` array. Assign action: a picker over `useEntities('DEVICE')` filtered to not-already-linked, submitting via a new `useLinkDevice()` hook (`POST /assets/:id/devices`). Unassign action only (no edit/delete-device) via a new `useUnlinkDevice()` hook (`DELETE /assets/:id/devices/:deviceId`). Per the scope decision above, this column can only be populated once an Asset is selected (the Customer-level "children" call only returns `assets`, since `POST /assets/:id/devices` requires an Asset id — assigning a Device directly to a bare Customer isn't wired on the backend this phase).

## Open questions for planning

- Exact 3-column layout/breadcrumb UX details (single unified breadcrumb bar vs. per-column) — left to plan-phase / implementation to detail.
- Whether "Add Asset" inside this panel reuses `AddAssetModal` as-is (it currently does its own independent Customer/level/parent selection) or needs a lighter variant that's pre-scoped to the panel's current selection — likely the latter, to avoid asking the user to re-pick a Customer/parent they already selected in the panel.
- Whether the whole panel needs sysadmin-only gating — no `/auth/me`-equivalent exists yet (same gap noted in Phase 7), so likely stays UI-visible-to-all with server-side 403s surfacing on privileged actions, same pattern as the rest of the app.

---
*Context saved for handoff to /paul:plan 8*
