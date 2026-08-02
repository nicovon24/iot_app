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
Phases: 5 of 7 complete (+4 inserted phases: 2.1, 2.2, 2.3, 4.3 — all complete). Backend V1 (Phases 1-4.3) and Phase 5 (Frontend foundation & API/WS clients) done. Next: Phase 6 (Entity views — devices, assets, attributes, live telemetry, alarms, map).

## Phases

**Phase Numbering:** Integer phases run in order 1 → 7. Decimal insertions (e.g. 2.1) reserved for urgent work discovered mid-milestone.

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Backend foundation & ThingsBoard auth | 1 | Complete | 2026-07-30 |
| 2 | Dynamic entities, attributes & telemetry API | 1 | Complete | 2026-07-30 |
| 2.1 | Extended entities API — auth guard, timeseries aggregation, attribute writes, create Device/Asset, Customers [INSERTED] | 1 | Complete | 2026-07-30 |
| 2.2 | TB-native users & customer-hierarchy scoping (sysadmin/admin/reader) [INSERTED] | 3 | Complete | 2026-07-31 |
| 2.3 | EntityRef reference-field enrichment (tenant/customer/assetProfile/owner as {id,name,label}) [INSERTED] | 1 | Complete | 2026-07-31 |
| 3 | Live telemetry & alarms (WebSocket gateways) | 2 | Complete | 2026-07-31 |
| 4 | Client creation wizard & static hierarchy (Prisma/Postgres) | 2 | Complete | 2026-08-01 |
| 4.3 | Asset hierarchy linking — parentCustomerId, Asset↔Customer/hierarchy Contains relation, remove POST /devices [INSERTED] | 3 | Complete | 2026-08-02 |
| 5 | Frontend foundation & API/WS clients | 3 | Complete | 2026-08-02 |
| 6 | Entity views — devices, assets, attributes, live telemetry, alarms, map | TBD | Planning | - |
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
- [x] 2.2-03: Closed all open gaps — hierarchy now uses TB's native `parentCustomerId` (not "Contains" relations, confirmed PE-only feature), list endpoints (`GET /devices`, `/assets`, `/entities`, `/customers`) scoped by customer hierarchy with real pagination/textSearch/sort (TB `PageData` contract), `tenantId`/`customerId`/`assetProfileId`/`ownerId`/`additionalInfo` exposed on entities/devices/assets, and a real guard-ordering bug found + fixed during verification (see `.paul/phases/2.2-tb-native-permissions/2.2-03-SUMMARY.md`) — fully runtime-verified against real ThingsBoard Cloud

### Phase 2.3: EntityRef reference-field enrichment (tenant/customer/assetProfile/owner as {id,name,label}) [INSERTED]

**Goal:** `EntityRef`'s `tenantId`/`customerId`/`assetProfileId`/`ownerId` stop being bare TB id strings and become `{id, name, label}` objects, batched and Redis-cached, so a frontend can display reference names without a second round-trip per entity.
**Depends on:** Phase 2.2 (extends `EntitiesService`'s existing mapping/scoping)
**Reason:** User-requested improvement, captured in `.paul/IMPROVEMENTS.md`, picked up ahead of Phase 5's frontend needing this shape.

**Scope:**
- `EntityRefLink` type (`{id, name?, label?}`)
- Batched, deduped reference resolution across an entire list response (not per-entity N+1), Redis-cached with a longer TTL than the existing ~3s telemetry cache
- No `refs` array — 4 separate enriched fields, per explicit user decision (see `IMPROVEMENTS.md`)

**Plans:**
- [x] 2.3-01: `EntityRefLink` type + batched/cached resolution in `EntitiesService` — applied and unified, all 4 ACs verified live against real ThingsBoard Cloud (see `.paul/phases/2.3-entity-ref-enrichment/2.3-01-SUMMARY.md`)

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
- [x] 03-01: Telemetry WebSocket gateway (subscribe/unsubscribe per entity) — applied and unified, verified live against real ThingsBoard Cloud (see `.paul/phases/03-live-telemetry-alarms/03-01-SUMMARY.md`)
- [x] 03-02: Alarms REST endpoints (Swagger docs) + Alarms WebSocket gateway — applied and unified, verified live against real ThingsBoard Cloud (see `.paul/phases/03-live-telemetry-alarms/03-02-SUMMARY.md`)

### Phase 4: Client creation wizard & static hierarchy (Prisma/Postgres)

**Goal:** An admin can create a Client and assign its hierarchy levels in one flow; the hierarchy is fixed from that point on. This is the only wizard in V1.
**Depends on:** Phase 1 (auth), independent of Phases 2-3
**Research:** Unlikely (internal CRUD + Prisma schema, pattern sketched in `.paul/ARCHITECTURE.md`'s Entity Model Summary)

**Scope (revised 2026-08-01 — see STATE.md Decisions "Client merged into Customer"):**
- "Client" is NOT a separate app-owned entity — it IS ThingsBoard's native Customer. Prisma schema: `CustomerHierarchyLevels` keyed by a real TB `customerId` — no local `Client` table, no duplication of Customer data
- `POST /customers` extended (sysadmin-only) to create a real TB Customer + its ordered hierarchy levels atomically; `GET /customers/:id/hierarchy` reads it back ordered by `levelIndex`
- Default suggested hierarchy for the Phase 7 wizard: **Site → Area → Asset → Sensor** (free-text per Customer, not a fixed enum)
- Validation: hierarchy is required at creation, rejected if empty; no update endpoint for hierarchy (immutable by design)
- Both endpoints documented in Swagger, including the "immutable after creation" behavior in the description

**Plans:**
- [x] 04-01: Prisma setup + Postgres wiring (`PrismaModule`/`PrismaService`, port-conflict fix, Prisma v6 pin) — applied and unified against a real local Postgres instance (see `.paul/phases/04-client-wizard-hierarchy/04-01-SUMMARY.md` — schema section superseded, infra section still accurate)
- [x] 04-02: Original standalone `POST /clients`/`GET /clients/:id/hierarchy` — applied, then **merged same-day into `customers/`** per user direction: `POST /customers` (sysadmin-only, atomic Customer+hierarchy creation, real TB Customer, hierarchy keyed by real `customerId`) + `GET /customers/:id/hierarchy`. Verified live end-to-end against real ThingsBoard Cloud (created "Acme Corp" Customer with Site/Area/Asset/Sensor levels, confirmed via `GET /customers/:id`). See `.paul/phases/04-client-wizard-hierarchy/04-02-SUMMARY.md`'s superseded-note

### Phase 4.3: Asset hierarchy linking — parentCustomerId, Asset↔Customer/hierarchy Contains relation, remove POST /devices [INSERTED]

**Goal:** Start building the real nested Customer→Asset tree (previously fully deferred to V2): a Customer can be created as a sub-customer directly, and every Asset created via this API must declare which Customer/hierarchy-level it belongs to and be linked via a real ThingsBoard "Contains" relation. Device creation is removed entirely rather than extended the same way.
**Depends on:** Phase 4 (extends `customers/`/`assets/` and the `CustomerHierarchyLevels` Prisma model)
**Reason:** User-requested extension mid-milestone, discussed and scoped interactively before planning (see STATE.md Decisions for the full discussion trail).

**Scope:**
- `POST /customers` gains an optional `parentCustomerId` to create nested sub-customers directly
- `POST /assets` requires `customerId` + `levelIndex` + `parentId` (Customer or existing Asset); validates the level against the Customer's real `CustomerHierarchyLevels`, validates parent/level consistency via a new `AssetHierarchyAssignment` Prisma model, and creates a real TB "Contains" relation (first real use of ThingsBoard's Relations API in this codebase)
- `POST /devices` removed entirely — Devices become read-only via this API (`GET /devices`, `GET /devices/:id` only) until a real Device linking design exists (V2)

**Plans:**
- [x] 4.3-01: `parentCustomerId` on Customer creation
- [x] 4.3-02: Remove `POST /devices`
- [x] 4.3-03: Asset creation hierarchy linking (`AssetHierarchyAssignment` model + validation + real TB Contains relation)

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
- [x] 05-01: Next.js scaffold + layout + nav — Tailwind v4 + HeroUI v2, dark-navy/electric-blue theme, full 7-item data-driven sidebar (see `.paul/phases/05-frontend-foundation/05-01-SUMMARY.md`)
- [x] 05-02: API/WS clients + shared types + TanStack Query setup — verified live against the real backend; found+fixed 2 real WS type-shape mismatches (see `.paul/phases/05-frontend-foundation/05-02-SUMMARY.md`)
- [x] 05-03: Login screen + session handling — real login wired to POST /auth/login, sessionStorage persistence, client-side AuthGate, logout, all verified live (see `.paul/phases/05-frontend-foundation/05-03-SUMMARY.md`)

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

## Version 2 (Not yet planned)

Deferred scope, pulled from PROJECT.md "Planned (Next — Version 2)" and STATE.md Deferred Issues. Not phase-numbered or scheduled — surfaced here so it isn't lost, to be broken into real phases when V1 ships.

| Item | Origin | Effort | Notes |
|------|--------|--------|-------|
| Asset creation wizard | PROJECT.md V2 scope | M | Mirrors the V1 Client wizard pattern from Phase 4/7 |
| Device creation + linking wizard (link Device to Client + Asset, default structure from `client_hierarchy_levels` template) | PROJECT.md V2 scope | M | V1 Phase 2.1 only creates bare unlinked Devices/Assets — this wizard does the linking |
| Área/asset-level permission granularity (finer than customer hierarchy) | PROJECT.md V2 scope / Phase 2.2 clarification | M | No design chosen yet — ThingsBoard CE has no Entity Groups to back it; would need either a TB PE upgrade or a parallel Postgres permission layer, a real architectural decision to make when picked up |
| User-creatable/editable dashboards (`react-grid-layout`), full dashboard config persistence | PROJECT.md V2 scope | L | Needs a Postgres schema for dashboard configs, out of V1's narrow Prisma scope |
| DELETE endpoints for devices/assets/customers | STATE.md Deferred Issues (Phase 2.1) | S | Add when a V2 wizard needs entity deletion |
| Jest test harness for `ThingsboardClientService`/cache-hit/auth-guard behavior | STATE.md Deferred Issues (Phase 1-2.1) | S | Deferred per explicit instruction until backend V1 is done — manual runtime verification covers V1 so far |
| Modify assets/devices "Contains" relations (relocate to another asset/location area) + read Relations API generally | IMPROVEMENTS.md | M | Extends the internal-only relations use from `CustomerScopeGuard` into a general read/write Relations capability |
| Maps/photos per asset/device/location-area with child-only pins (one level deep) + navigation dashboard w/ status/type filters | IMPROVEMENTS.md | L | Frontend-heavy; needs a place to persist map/photo refs, likely Postgres |
| Device Profiles / Asset Profiles access (read, eventually manage) | IMPROVEMENTS.md | M | TB alarm rules are defined at profile level — natural pairing with the V1 Alarms module (Phase 3) once profiles are picked up |
| Entity Groups for asset creation (set groups within owner) | IMPROVEMENTS.md | M | Only available while the current ThingsBoard Professional Edition trial (1 month, up to 5 sensors) is active — depends on that subscription continuing or a deliberate PE upgrade |
| Tenant Admin: list all tenant users + "login as user" impersonation | IMPROVEMENTS.md | M | Extends Phase 2.2's `users` module; impersonation needs careful session/security design (whose TB token is used, audit trail) |
| User edit: attributes + customer reassignment; email-based activation w/ double password confirmation as an alternative to the existing activation-link flow | IMPROVEMENTS.md | M | Extends Phase 2.2-02's `users` module (create/list/delete → add update + alternate activation flow) |
| User profile fields (first/last name, phone, description) + default dashboard / fullscreen preference via `additionalInfo` | IMPROVEMENTS.md | M | Dashboard preference depends on Phase 4/7's dashboard model existing first |
| Reporting module | IMPROVEMENTS.md | L | Explicitly deferred to the last stages of the project, lowest priority in this table |
| Audit Logs | IMPROVEMENTS.md | S | Not v1, not yet scheduled for v2 either — revisit when picked up |

---
*Roadmap created: 2026-07-30*
*Last updated: 2026-08-01*
