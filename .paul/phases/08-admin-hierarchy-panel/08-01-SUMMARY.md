---
phase: 08-admin-hierarchy-panel
plan: 01
subsystem: backend
tags: [relations, thingsboard, hierarchy, devices]

requires:
  - phase: 4.3-asset-hierarchy-linking
    provides: EntitiesService.createRelation (Contains, Asset-only), assignAssetToCustomer, AssetHierarchyAssignment
provides:
  - EntityRef.parentCustomerId (CUSTOMER only), resolved/cached like other ref fields
  - EntitiesService.getRelationChildren(fromId, fromType) — real Contains-relation children split into {assets, devices}
  - EntitiesService.updateAsset(), deleteRelation(); createRelation() widened to allow toType 'DEVICE'
  - PATCH /assets/:id, GET /assets/:id/children, POST+DELETE /assets/:id/devices(/:deviceId), GET /customers/:id/children
  - AssetsService.delete() now blocks if the Asset has children (Assets or Devices)
affects: []

tech-stack:
  added: []
  patterns:
    - "Device↔Asset and Asset↔Asset/Customer hierarchy reads are pure real TB Contains relations (GET /api/relations), never duplicated in Postgres — consistent with the project's 'TB is the single source of truth' constraint. Only levelIndex tracking (AssetHierarchyAssignment, Phase 4.3) stays in Postgres, since TB has no native concept of hierarchy level."
    - "getRelationChildren batches getById per related entity (small N at this project's scale) rather than a bulk lookup — mirrors the accepted N+1 pattern already used by FleetMarker (Phase 6.4), not a new anti-pattern"

key-files:
  modified:
    - backend/src/types/entities.types.ts
    - backend/src/entities/entities.service.ts
    - backend/src/assets/assets.service.ts
    - backend/src/assets/assets.controller.ts
    - backend/src/customers/customers.controller.ts
  created:
    - backend/src/assets/dto/update-asset.dto.ts
    - backend/src/assets/dto/link-device.dto.ts

key-decisions:
  - "Asset delete guard checks getRelationChildren() (real TB relations), not a Postgres count — unlike CustomersService.delete()'s Asset-count check which uses Postgres (AssetHierarchyAssignment), because Devices have no Postgres row at all; TB relations are the only place both child-Asset and linked-Device information live together"
  - "updateAsset() does a GET-then-POST upsert (fetch existing TbAsset, merge requested fields, POST /api/asset) rather than a partial-update TB endpoint — ThingsBoard's asset API doesn't support partial PATCH natively, this is the standard TB upsert pattern"

duration: ~40min (including a delayed verification pass — code was written in a prior session turn, verification completed this turn)
started: 2026-08-03T00:00:00Z
completed: 2026-08-04T00:00:00Z
description: "Backend: sub-customer breadcrumbs (parentCustomerId), Contains-relation tree reads, Asset PATCH, Device assign/unassign"
type: Summary
about: "iot-app"
---

# Phase 8 Plan 01: Admin Panel Backend Summary

**Every backend capability the admin panel (08-02) needs — sub-customer breadcrumb data, real Contains-relation tree reads (Customer/Asset → child Assets/Devices), Asset editing, and Device assign/unassign — is now live and verified against real ThingsBoard Cloud, with zero Postgres schema changes.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Sub-customer breadcrumbs are resolvable | Pass | Created a real sub-customer ("Sub Client Verify 08") under "Test" with `parentCustomerId`; `GET /customers` returned it with `parentCustomerId: {id, name: "Test"}` fully resolved, not a bare id |
| AC-2: Contains-relation children are readable, split by type | Pass | Created a level-0 Asset under the sub-customer and a level-1 child Asset under that; `GET /customers/:id/children` correctly returned the level-0 Asset under `assets` (empty `devices`); `GET /assets/:id/children` on the level-0 Asset correctly returned the level-1 Asset under `assets` |
| AC-3: A Device can be assigned to and unassigned from an Asset | Pass | `POST /assets/:id/devices {deviceId}` with a real Device (`industrial-pump-001`) → 201, confirmed in the Asset's `children.devices`; `DELETE /assets/:id/devices/:deviceId` → 204, confirmed gone from `children.devices` |
| AC-4: An Asset's name/type/label can be updated | Pass | `PATCH /assets/:id {name: "Renamed L1 Asset"}` → the name updated; the unrelated `type`/profile (`assetProfileId.name: "area"`) was correctly preserved unchanged |
| AC-5: Asset deletion is blocked when it has children | Pass | `DELETE` on the level-0 Asset while its level-1 child still existed → 400 `"Cannot delete this Asset — it still has 1 child Asset(s) and 0 linked Device(s). Remove them first."`; after deleting the child, the same delete succeeded (204) |

## Accomplishments

- Closed the two real backend gaps this phase needed: no Device↔Asset relation existed anywhere before this, and no endpoint could read the real TB Contains-relation tree at all (only write, via Phase 4.3's `createRelation`)
- Confirmed a genuine TB behavior worth remembering: a Customer's `hierarchyLevels` are immutable at creation — attempting to create a child Asset at `levelIndex: 1` under a Customer whose hierarchy only defined `levelIndex: 0` correctly 400s with "Parent asset must be exactly one level above this asset" (caught during verification, required recreating the test Customer with 2 levels — not a bug, expected Phase 4 behavior)
- All new capability required zero Postgres changes — pure ThingsBoard relation reads/writes, keeping the project's "TB is the single source of truth" constraint intact even as the hierarchy browsing surface grew significantly

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `backend/src/types/entities.types.ts` | Modified | `EntityRef` gains `parentCustomerId?: EntityRefLink` |
| `backend/src/entities/entities.service.ts` | Modified | `parentCustomerId` resolution in `toEntityRefs`/`collectRefs`; new `getRelationChildren()`, `updateAsset()`, `deleteRelation()`; `createRelation()` widened to `toType: 'ASSET' \| 'DEVICE'` |
| `backend/src/assets/assets.service.ts` | Modified | `delete()` now guards on children; new `update()`, `linkDevice()`, `unlinkDevice()` |
| `backend/src/assets/assets.controller.ts` | Modified | New `PATCH /assets/:id`, `GET /assets/:id/children`, `POST`/`DELETE /assets/:id/devices(/:deviceId)` |
| `backend/src/customers/customers.controller.ts` | Modified | New `GET /customers/:id/children` |
| `backend/src/assets/dto/update-asset.dto.ts` | Created | `UpdateAssetDto` (name/type/label, all optional) |
| `backend/src/assets/dto/link-device.dto.ts` | Created | `LinkDeviceDto` (`deviceId`) |

## Verification Method

Direct `curl` against the real running backend with a real ThingsBoard Cloud session (`POST /auth/login` with real credentials from `backend/.env`), exercising every AC's exact scenario against real Customers/Assets/Devices — no mocking, consistent with every prior phase in this project. All test data created purely for verification (the sub-customer and its two test Assets) was deleted afterward; only the pre-existing "Test" Customer remains on the tenant.

## Deviations from Plan

None functionally. One verification-sequencing correction: the first sub-customer was created with only 1 hierarchy level (`levelIndex: 0`), which correctly blocked creating a `levelIndex: 1` child Asset (expected Phase 4 immutability behavior, not a bug) — recreated the test Customer with 2 levels to properly exercise AC-2's nested-child scenario.

## Next Phase Readiness

**Ready:**
- All 5 endpoints/capabilities 08-02 (frontend) needs are live-verified against real ThingsBoard Cloud
- No backend changes anticipated for 08-02 — it's pure frontend composition on top of this plan's endpoints

**Concerns:** None new. Same standing gap as every prior phase: no `/auth/me`-equivalent endpoint, so the admin panel's UI will be visible to any session with real enforcement staying server-side (consistent with Phase 7's same decision).

**Blockers:** None. 08-02 (frontend admin panel) can proceed.

---
*Built with PAUL Framework · iot_app*
*Phase: 08-admin-hierarchy-panel, Plan: 01*
*Completed: 2026-08-04*
