---
phase: 04-client-wizard-hierarchy
plan: 02
subsystem: api
tags: [nestjs, prisma, swagger, rbac]

requires:
  - phase: 04-client-wizard-hierarchy (04-01)
    provides: PrismaService, Client/ClientHierarchyLevels models
affects: [phase-7-client-wizard-ui]

tech-stack:
  added: []
  patterns: ["ParseUuidPipe for app-owned Postgres ids, mirroring ParseTbIdPipe's shape for ThingsBoard ids but kept as a separate pipe since the id spaces are semantically different"]

key-files:
  created:
    - backend/src/clients/clients.module.ts
    - backend/src/clients/clients.service.ts
    - backend/src/clients/clients.controller.ts
    - backend/src/clients/dto/create-client.dto.ts
    - backend/src/common/pipes/uuid.pipe.ts
  modified:
    - backend/src/app.module.ts

key-decisions:
  - "POST /clients uses Prisma's nested write (client.create with hierarchyLevels: { create: [...] }) for atomicity, not a manual $transaction — the correct built-in tool for parent+children creation"
  - "New ParseUuidPipe instead of reusing ParseTbIdPipe — same regex shape, but a deliberately separate pipe since Client ids are app-owned Postgres uuids, not ThingsBoard ids"

patterns-established:
  - "Sysadmin-only controllers reuse RolesGuard + @Roles('SYSADMIN') exactly as UsersController does — no new authorization pattern introduced"

duration: ~1 session
description: "POST /clients (atomic nested-write creation) and GET /clients/:id/hierarchy, sysadmin-gated, Swagger-documented with immutability note"
type: Summary
about: "iot-app"
---

# Phase 4 Plan 02: Client Creation Endpoint + Get-Hierarchy Summary

> **⚠️ SUPERSEDED same day (2026-08-01).** The user clarified that "Client" and ThingsBoard's native "Customer" should be the same concept, not two parallel entities. The standalone `Client` Postgres model and `clients/` module described below were removed and merged into the existing `customers/` module: `POST /customers` now creates a real TB Customer + its hierarchy atomically, and `GET /customers/:id/hierarchy` reads it back — keyed by the real TB `customerId`, not a local `Client.id`. See STATE.md Decisions ("Client merged into Customer") for the current, accurate design. This SUMMARY is kept as a historical record of what 04-02 originally built; do not use `backend/src/clients/` or the `Client`/`ClientHierarchyLevels` Prisma models as reference — they no longer exist.

**Sysadmin-only `POST /clients` creates a Client and its ordered hierarchy levels atomically via Prisma's nested write; `GET /clients/:id/hierarchy` reads it back ordered by levelIndex. No update/delete endpoint exists — hierarchy is immutable by design, documented explicitly in Swagger. All verified against the real Postgres instance from 04-01 and a real ThingsBoard-authenticated sysadmin session.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Client + hierarchy created atomically | Pass | `POST /clients` with 2 levels returned 201 with both nested rows present, verified via real Postgres query |
| AC-2: Empty hierarchy rejected | Pass | `hierarchyLevels: []` → 400 at the DTO layer (`@ArrayMinSize(1)`), before reaching the service |
| AC-3: Non-sysadmin cannot create a Client | **Not re-verified live** | No authenticated non-sysadmin test account currently works — `operator@customer-a.com` returns 401 "Invalid credentials" (same account noted as broken in STATE.md's Phase 3 concerns, password likely rotated outside this session). `RolesGuard`/`@Roles('SYSADMIN')` is reused byte-for-byte from `UsersController`, already proven against real accounts in Phase 2.2 — no new logic introduced. Verified instead: no-session request correctly returns 401 (SessionAuthGuard) |
| AC-4: Hierarchy readable and ordered | Pass | `GET /clients/:id/hierarchy` returned both levels ordered by `levelIndex` ascending |
| AC-5: No update/edit endpoint exists | Pass | `ClientsController` only exposes `POST /clients` and `GET /clients/:id/hierarchy`, confirmed by inspection and Swagger JSON |

## Accomplishments

- Full atomic create-with-children flow verified against real Postgres (not mocked): a failed insert of either row would leave nothing behind, per Prisma's nested-write semantics
- Extra runtime checks beyond the plan's explicit ACs: 404 for a nonexistent Client id, 400 for a malformed (non-UUID) id, 401 for no session at all
- Swagger JSON confirmed the immutability note is present in the live `POST /clients` description, not just in source comments

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `backend/src/clients/dto/create-client.dto.ts` | Created | `CreateClientDto` + `HierarchyLevelDto`, `@ArrayMinSize(1)` enforces AC-2 |
| `backend/src/clients/clients.service.ts` | Created | `create()` (nested Prisma write), `getHierarchy()` (404 if Client missing) |
| `backend/src/clients/clients.controller.ts` | Created | `POST /clients`, `GET /clients/:id/hierarchy`, sysadmin-gated, Swagger-decorated |
| `backend/src/clients/clients.module.ts` | Created | Wires controller + service |
| `backend/src/common/pipes/uuid.pipe.ts` | Created | `ParseUuidPipe` for app-owned Postgres ids |
| `backend/src/app.module.ts` | Modified | Registered `ClientsModule` |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Nested Prisma write instead of manual `$transaction` | Simplest correct tool for atomic parent+children creation — Prisma builds this into a single SQL transaction internally | Cleaner service code, same atomicity guarantee |
| Separate `ParseUuidPipe`, not a reused `ParseTbIdPipe` | Client ids are app-owned Postgres uuids, semantically distinct from ThingsBoard entity ids even though the regex happens to match the same shape | Keeps the two id spaces conceptually separate for future maintainers |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 0 | — |
| Deferred | 1 | Logged below — re-verification gap, not a code defect |

**Total impact:** Minor — the one deferral is a test-account availability issue external to this plan's code, identical in nature to the same gap already logged against Phase 3 (03-02).

### Deferred Items

- **AC-3 non-sysadmin rejection not re-verified live this session**: the only non-sysadmin test account (`operator@customer-a.com`) currently returns 401 on ThingsBoard login — its password appears to have been rotated or the account otherwise touched outside this session (same account flagged as broken in STATE.md's existing Blockers/Concerns from Phase 3). `RolesGuard`/`@Roles('SYSADMIN')` is unchanged, reused verbatim from `UsersController`, and was already proven against real accounts during Phase 2.2. Revisit: reset this test account's password (or create a fresh Customer User) and re-run the 403 check specifically against `POST /clients` and `GET /clients/:id/hierarchy`.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Port 3001 already bound by a leftover `nest start --watch` process from 04-01's verification | Killed the stale process before starting a fresh server for 04-02's verification |
| Test CUSTOMER_USER account unusable (401) | Documented as a deferred re-verification item, consistent with the same gap already logged for Phase 3 |

## Next Phase Readiness

**Ready:**
- Phase 4 complete — the V1 wizard's only backend piece (`POST /clients` + `GET /clients/:id/hierarchy`) is live, atomic, sysadmin-gated, and Swagger-documented
- Phase 7 (wizard UI) has a stable contract to build against: `{name, hierarchyLevels: [{levelIndex, name}]}` in, nested `Client` + levels out

**Concerns:**
- The non-sysadmin re-verification gap (AC-3) should be closed early in a future session, ideally alongside the same gap already open for Phase 3's alarms scoping — both point to the same broken test account
- No hierarchy update/delete exists anywhere, by design — if this constraint ever needs revisiting, it requires a deliberate new decision, not a quiet endpoint addition

**Blockers:** None

---
*Phase: 04-client-wizard-hierarchy, Plan: 02*
*Completed: 2026-08-01*
