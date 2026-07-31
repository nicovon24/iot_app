---
description: "iot_app — milestone and phase structure"
type: Roadmap
about: "iot-app"
---

# Roadmap: IoT Platform (iot_app)

## Overview

Prove ThingsBoard can back a product with a far more capable frontend and API than its native UI. Version 1 builds a NestJS backend that proxies ThingsBoard dynamically (entities, attributes, telemetry, alarms) with Redis caching, plus the one onboarding flow in scope for V1 (Client creation + static hierarchy assignment), and a Next.js frontend that consumes it live via WebSocket. Version 2 (not detailed here yet) adds Asset/Device wizards, roles/permissions, and user-editable dashboards.

## Current Milestone

**Version 1 — ThingsBoard-backed API + live dashboard shell** (v1.0)
Status: In progress
Phases: 2 of 7 complete (+2 inserted phases: 2.1 complete, 2.2 code-complete — both 2.2-01 and 2.2-02 scope implemented, not yet runtime-verified/unified)

## Phases

**Phase Numbering:** Integer phases run in order 1 → 7. Decimal insertions (e.g. 2.1) reserved for urgent work discovered mid-milestone.

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Backend foundation & ThingsBoard auth | 1 | Complete | 2026-07-30 |
| 2 | Dynamic entities, attributes & telemetry API | 1 | Complete | 2026-07-30 |
| 2.1 | Extended entities API — auth guard, timeseries aggregation, attribute writes, create Device/Asset, Customers [INSERTED] | 1 | Complete | 2026-07-30 |
| 2.2 | TB-native users & customer-hierarchy scoping (sysadmin/admin/reader) [INSERTED] | 2 | Code complete, unverified | - |
| 3 | Live telemetry & alarms (WebSocket gateways) | TBD | Not started | - |
| 4 | Client creation wizard & static hierarchy (Prisma/Postgres) | TBD | Not started | - |
| 5 | Frontend foundation & API/WS clients | TBD | Not started | - |
| 6 | Entity views — devices, assets, attributes, live telemetry, alarms, map | TBD | Not started | - |
| 7 | Client creation wizard UI | TBD | Not started | - |

## Phase Details

### Phase 1: Backend foundation & ThingsBoard auth

**Goal:** A running NestJS+Fastify service that logs into ThingsBoard and exposes its own session to callers, with Redis wired in from the start.
**Depends on:** Nothing (first phase)
**Research:** Likely (ThingsBoard auth/refresh-token flow, Redis TTL strategy for JWT caching)

**Scope:**
- NestJS + Fastify scaffold (`backend/`), config module with env validation (`THINGSBOARD_URL`, `THINGSBOARD_USERNAME`, `THINGSBOARD_PASSWORD`, `REDIS_URL`)
- `thingsboard/` module: login, refresh, generic authenticated request helper
- Redis module: caches the ThingsBoard JWT (TTL-aligned with TB token expiry)
- `auth/` module: `POST /auth/login`, `POST /auth/logout` — app-level session, ThingsBoard JWT never reaches the frontend
- Swagger wired up from the first endpoint

**Plans:**
- [x] 01-01: NestJS + Fastify + Redis + config scaffold + ThingsBoard client service (login/refresh, JWT cache in Redis) + Auth module (login/logout) + Swagger baseline — shipped as a single plan (see `.paul/phases/01-backend-foundation/01-01-SUMMARY.md`); AC-2/AC-3 need a live TB + Redis instance to runtime-verify, not done this session

### Phase 2: Dynamic entities, attributes & telemetry API

**Goal:** Any Device/Asset can be looked up generically, and any attribute/telemetry key it has can be read — no hardcoded key lists per device type.
**Depends on:** Phase 1 (needs authenticated TB client)
**Research:** Likely (ThingsBoard's entity/attribute/telemetry REST contract, key-agnostic query design)

**Scope:**
- `entities/` module: `EntityRef` type unifying Device/Asset, `GET /entities?type=DEVICE|ASSET`, `GET /entities/:id`
- `devices/`, `assets/` modules: thin listing endpoints on top of `entities/`
- `attributes/` module: `GET /entities/:id/attributes?scope=CLIENT_SCOPE|SERVER_SCOPE|SHARED_SCOPE` — dynamic, returns whatever keys exist
- `telemetry/` module (REST part): `GET /entities/:id/telemetry/keys`, `GET /entities/:id/telemetry/latest`, `GET /entities/:id/telemetry/timeseries` — values serialized as strings per `.paul/rules/api.md`
- Redis read-through cache for attributes/telemetry latest (short TTL, e.g. a few seconds) to cut TB + DB load
- Every endpoint documented in Swagger as it's built (DTOs decorated with `@ApiProperty`, responses typed) — Swagger UI is the primary way to test these endpoints, no Bruno/Postman collections

**Plans:**
- [x] 02-01: Entities/Devices/Assets/Attributes/Telemetry REST — shipped as a single plan (see `.paul/phases/02-dynamic-entities-api/02-01-SUMMARY.md`); runtime-verified against real ThingsBoard Cloud + Redis on 2026-07-30

### Phase 2.1: Extended entities API — auth guard, timeseries aggregation, attribute writes, create Device/Asset, Customers [INSERTED]

**Goal:** Close a real gap found while extending Phase 2 (no endpoint actually enforced the session `/auth/login` issues) and extend the read-only Phase 2 API with real interval-bucketed timeseries aggregation, attribute key filtering + writes, Device/Asset creation, and Customer as a third entity type.
**Depends on:** Phase 2 (extends its entities/attributes/telemetry modules directly)
**Reason:** User-requested extension mid-milestone, discovered together with a security gap (missing auth enforcement) that should not wait for a later integer phase.

**Scope:**
- Global `SessionAuthGuard` (via `APP_GUARD`) protecting every endpoint except `POST /auth/login`; Swagger `DocumentBuilder` gets an `addApiKey` security scheme so its "Authorize" button covers every documented endpoint
- `telemetry/timeseries`: fixes the Phase 2 bug where `agg` silently set `interval` to the full range (one bucket instead of many); exposes `limit` (omit = ThingsBoard's own default, no backend-invented cap) and `interval` (ms) for real bucketed aggregation (e.g. avg temperature every 5 minutes)
- `attributes`: GET gains a `keys` filter; new `POST /entities/:id/attributes` writes attributes dynamically (no fixed schema), invalidates the relevant Redis cache entries
- `devices`, `assets`: new `POST` endpoints to create a Device/Asset in ThingsBoard (no Client/hierarchy linking — that's Phase 4/V2)
- `entities`: `EntityType` widened to include `CUSTOMER`; new `customers` module (`GET /customers`, `GET /customers/:id`) mirroring `devices`/`assets`

**Plans:**
- [x] 02.1-01: Auth guard + Swagger security scheme, timeseries fix, attribute keys/writes, Device/Asset creation, Customers — shipped and runtime-verified against real ThingsBoard Cloud + Redis (see `.paul/phases/02.1-extended-entities-api/02.1-01-SUMMARY.md`)

**Note for Phase 6:** the frontend telemetry widget should expose an interval picker (e.g. "every 5 min") once this ships, to actually use the new `interval`/`agg` params.

### Phase 2.2: TB-native users & customer-hierarchy scoping (sysadmin/admin/reader) [INSERTED]

**Goal:** Real per-user identity and authorization, closing the gap where every authenticated session is equally privileged (found via code review after Phase 2.1). Login authenticates against ThingsBoard itself; access is scoped by the ThingsBoard customer hierarchy, not a single shared service account.
**Depends on:** Phase 2.1 (extends `auth/` and the global `SessionAuthGuard`)
**Reason:** User-requested extension mid-milestone; a code review of Phase 2.1 (CR-01/CR-02) found that the shared-account model lets any authenticated session read/write any customer's data, which this phase closes as a real security gap, not a style nit.

**Scope:**
- **Identity model** (confirmed CE, no Entity Groups/PE):
  - `sysadmin` = ThingsBoard Tenant Admin of the main tenant — pre-existing account, never created/deleted via the app, sees/manages everything.
  - `admin`/`reader` = ThingsBoard **Customer Users**, created by the app, each attached to one `customerId`. `admin` can write, `reader` is read-only.
  - Users live natively in ThingsBoard (no parallel app-owned users table).
- **Auth**: `auth.service.ts` replaces the shared-account credential check with a real `POST /api/auth/login` against ThingsBoard using the submitted credentials; session (Redis) stores `{ tbUserId, authority, customerId }` resolved from the TB login response.
- **Scoping — customer hierarchy, not per-asset**: a `sysadmin` (Tenant Admin) sees everything; a `admin`/`reader` sees its own customer **and any descendant sub-customers** (TB's native customer parent/child hierarchy), enforced via `CustomerScopeGuard`. No Postgres/Prisma involvement, no área/asset-level granularity in this phase — that stays deferred (TB CE has no Entity Groups for it, see PROJECT.md Constraints).
- **Security fixes carried in the same pass** (prerequisite for scoping to mean anything): validate `:id` path params as TB UUIDs before interpolating into any ThingsBoard request path (closes path traversal found in review); use `URLSearchParams` consistently for query params built from user input (closes query-injection found in review).
- New `users` module: CRUD backed by TB Customer User APIs (create/list/delete `admin`/`reader` scoped to a customer). Only `sysadmin` can create/delete users; the tenant admin account itself can never be deleted via this module.

**Plans:**
- [x] 2.2-01: TB-native login + session model + `CustomerScopeGuard` (hierarchy-aware, wired as a second global `APP_GUARD` alongside `SessionAuthGuard`) + `:id`/query validation fixes — code complete, not yet runtime-verified against real ThingsBoard (see `.paul/STATE.md` Blockers/Concerns)
- [x] 2.2-02: `users` module (create/list/delete Customer Users, sysadmin-only via `RolesGuard`/`@Roles('SYSADMIN')`) — implemented in the same session as 2.2-01 (no separate plan file was written before coding this one); code complete, not yet runtime-verified

### Phase 3: Live telemetry & alarms (WebSocket gateways)

**Goal:** Frontend can subscribe to live telemetry and live alarms for a chosen entity without ThingsBoard credentials ever leaving the backend.
**Depends on:** Phase 2 (entities/telemetry REST already defined)
**Research:** Likely (ThingsBoard's own WS telemetry subscription protocol, proxying it cleanly through Nest)

**Scope:**
- `telemetry/telemetry.gateway.ts`: WS proxy — client subscribes by entity id, gateway subscribes upstream to ThingsBoard and relays updates
- `alarms/` module: `GET /entities/:id/alarms`, `GET /alarms` (global, filterable by severity/status), `alarms.gateway.ts` WS proxy for live alarm push
- Reconnect/backoff handling on the upstream TB WS connection
- Alarms REST endpoints documented in Swagger; WS gateways documented in Swagger's description/tags where supported (Swagger can't "try out" WS — note this limitation directly in the endpoint docs, plus a short `.paul/rules/testing.md` note on using `wscat`/a test script for the gateways)

**Plans:**
- [ ] 03-01: Telemetry WebSocket gateway (subscribe/unsubscribe per entity)
- [ ] 03-02: Alarms REST endpoints (Swagger docs) + Alarms WebSocket gateway

### Phase 4: Client creation wizard & static hierarchy (Prisma/Postgres)

**Goal:** An admin can create a Client and assign its hierarchy levels in one flow; the hierarchy is fixed from that point on. This is the only wizard in V1.
**Depends on:** Phase 1 (auth), independent of Phases 2-3
**Research:** Unlikely (internal CRUD + Prisma schema, pattern sketched in `.paul/ARCHITECTURE.md`'s Entity Model Summary)

**Scope:**
- Prisma schema: `hierarchy_level_definitions` + Client reference — nothing else persisted yet
- `POST /clients` (creates Client + its hierarchy levels atomically), `GET /clients/:id/hierarchy`
- Validation: hierarchy is required at creation, rejected if empty; no update endpoint for hierarchy (immutable by design)
- Both endpoints documented in Swagger, including the "immutable after creation" behavior in the description

**Plans:**
- [ ] 04-01: Prisma setup + `hierarchy_level_definitions` schema + migration
- [ ] 04-02: Client creation endpoint (Client + hierarchy, atomic) + get-hierarchy endpoint + Swagger docs

### Phase 5: Frontend foundation & API/WS clients

**Goal:** A running Next.js app with the base layout/nav and typed clients for the backend REST + WS APIs.
**Depends on:** Phase 1 (needs a backend to talk to), benefits from Phase 2 types being stable
**Research:** Unlikely (standard Next.js + TanStack Query + Zustand setup)

**Scope:**
- Next.js App Router scaffold, `AppLayout` with sidebar nav (Devices, Assets, Alarms, Dashboard)
- `lib/api-client.ts` (typed fetch wrapper), `lib/ws-client.ts`, `lib/query-client.ts` (TanStack Query provider)
- `types/` mirroring backend Entity/Attribute/TelemetryKey/TelemetryValue/Alarm types
- Login screen wired to `POST /auth/login`

**Plans:**
- [ ] 05-01: Next.js scaffold + layout + nav
- [ ] 05-02: API/WS clients + shared types + TanStack Query setup
- [ ] 05-03: Login screen + session handling

### Phase 6: Entity views — devices, assets, attributes, live telemetry, alarms, map

**Goal:** From the nav, a user can list Devices/Assets and drill into any entity to see live attributes, live telemetry (chosen key), live alarms, and a map when lat/long exist.
**Depends on:** Phase 2, 3, 5
**Research:** Unlikely (mostly composition of hooks + widgets already scoped)

**Scope:**
- `hooks/`: `useEntities`, `useEntityAttributes`, `useEntityTelemetry`, `useLiveTelemetry`, `useEntityAlarms`, `useLiveAlarms`
- `widgets/`: `ValueTileWidget`, `LineChartWidget` (Recharts), `AttributesTableWidget`, `AlarmsListWidget`, `MapWidget` (react-leaflet)
- Pages: `devices/`, `assets/`, `entities/[id]` (tabs: Attributes / Telemetry / Alarms / Map — Map tab only if lat/long present), `alarms/` (global list)

**Plans:**
- [ ] 06-01: Devices/Assets list pages + entity picker
- [ ] 06-02: Entity detail page — Attributes + Telemetry tabs (live)
- [ ] 06-03: Entity detail page — Alarms + Map tabs (live) + global Alarms page

### Phase 7: Client creation wizard UI

**Goal:** An admin can create a Client and define its hierarchy from the frontend, matching the backend wizard from Phase 4.
**Depends on:** Phase 4, Phase 5
**Research:** Unlikely (standard multi-step form, React Hook Form + Zod already in stack)

**Scope:**
- Wizard flow: Client basic info → hierarchy level definition (add/reorder levels) → review → submit
- Client-side validation mirroring backend (hierarchy required, immutable after submit — UI makes this explicit)

**Plans:**
- [ ] 07-01: Wizard steps + form state (React Hook Form + Zod)
- [ ] 07-02: Submit flow wired to `POST /clients` + confirmation/error states

---
*Roadmap created: 2026-07-30*
*Last updated: 2026-07-30*
