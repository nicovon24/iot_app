---
description: "iot_app — milestone and phase structure"
type: Roadmap
about: "iot-app"
---

# Roadmap: IoTArg (iot_app)

## Overview

Prove ThingsBoard can back a product with a far more capable frontend and API than its native UI. Version 1 builds a NestJS backend that proxies ThingsBoard dynamically (entities, attributes, telemetry, alarms) with Redis caching, plus the one onboarding flow in scope for V1 (Client creation + static hierarchy assignment), and a Next.js frontend that consumes it live via WebSocket. Version 2 (not detailed here yet) adds Asset/Device wizards, roles/permissions, and user-editable dashboards.

## Current Milestone

**Version 1 — ThingsBoard-backed API + live dashboard shell** (v1.0)
Status: Complete
Phases: 7 of 7 complete (+6 inserted phases: 2.1, 2.2, 2.3, 4.3, 6.4, 6.5 — all complete). All V1 scope shipped: backend (Phases 1-4.3), frontend foundation through entity views/fleet map/dashboard (Phases 5-6.5), and the Client creation wizard + Asset creation flow (Phase 7). V1 milestone complete.

**Version 2 — Admin hierarchy panel + Device linking** (v2.0, in progress)
Status: In progress
Phase 8 (Admin hierarchy management panel) complete 2026-08-04, first V2 phase shipped. Backend (08-01: sub-customer breadcrumbs, Contains-relation tree reads, Asset PATCH, Device assign/unassign) and frontend (08-02: the `/admin` panel itself) both applied and verified. **Phase 9.1 (Visual modernization) complete 2026-08-05** — all 3 plans (light glassmorphic redesign, skeleton loading system, restyled Admin/dialogs/entity-detail/Alarms) applied, plus further chat-driven dark-theme palette iterations after the initial light-glass ship (see STATE.md Decisions/Addenda) — maps deliberately excluded throughout. **Phase 9.2 (roles enforcement & user management) complete 2026-08-05** — all 3 plans (9.2-01 READER write-block guard, 9.2-02 Users management UI, 9.2-03 impersonation) applied, plus a substantial chat-driven follow-up (client-side role-based UI gating via a new `GET /auth/me`, an "All Clients" default view, a real activation-link bug fix, code-review fixes, and a Tooltip portal rewrite) — see `9.2-03-SUMMARY.md`'s Addendum. **Phase 10 (dashboard builder) code-complete 2026-08-05** — all 3 plans (10-01 backend: Prisma schema + widget registry + scoped CRUD; 10-02 frontend base: canvas + one-by-one Add-widget panel + dynamic Sidebar selector; 10-03 bulk-add) applied, backend live-verified via curl, frontend verified via `tsc`/`next build` only — **a real browser click-through is the top outstanding item** before this phase is considered fully done, no browser tool available this session. Phase 11 (testing harness, backend + frontend) discussed (CONTEXT.md written) but not yet scheduled — see its CONTEXT.md's Recommendation (run after Phase 10's browser verification).

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
| 6 | Entity views — devices, assets, attributes, live telemetry, alarms, map | 3 | Complete | 2026-08-02 |
| 6.4 | Fleet map view — custom markers, clustering, nav entry [INSERTED] | 1 | Complete | 2026-08-02 |
| 6.5 | Main Dashboard — fleet summary, counts, map, tables, alarms [INSERTED] | 1 | Complete | 2026-08-03 |
| 7 | Client creation wizard UI + Asset creation flow | 2 | Complete | 2026-08-03 |
| 8 | Admin hierarchy management panel (V2, first phase) | 2 | Complete | 2026-08-04 |
| 9.1 | Visual modernization | 3 | Complete | 2026-08-05 |
| 9.2 | Roles enforcement & user management | 3 | Complete | 2026-08-05 |
| 10 | User-editable dashboards (builder) | 3 applied + 3 planned (10-04/05/06) | 10-01..03 code-complete, browser verification pending; 10-04 planned | 2026-08-05 |
| 11 | Testing harness — backend + frontend (whole app) | TBD | Discussed (CONTEXT.md), **not scheduled** (see Recommendation in its CONTEXT.md) | — |
| 12 | Telemetry unit system + new widget types | TBD | Not started | — |

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
- [x] 04-02: Original standalone `POST /clients`/`GET /clients/:id/hierarchy` — applied, then **merged same-day into `customers/`** per user direction: `POST /customers` (sysadmin-only, atomic Customer+hierarchy creation, real TB Customer, hierarchy keyed by real `customerId`) + `GET /customers/:id/hierarchy`. Verified live end-to-end against real ThingsBoard Cloud (created "Test Comp" Customer with Site/Area/Asset/Sensor levels, confirmed via `GET /customers/:id`). See `.paul/phases/04-client-wizard-hierarchy/04-02-SUMMARY.md`'s superseded-note

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
- [x] 06-01: Devices/Assets list pages + entity picker — real ThingsBoard-backed data, plus an unplanned but substantial UI pass (dark/light mode, sidebar redesign, custom Tooltip, semantic text tokens) done live per user feedback (see `.paul/phases/06-entity-views/06-01-SUMMARY.md`)
- [x] 06-02: Entity detail page — Attributes + Telemetry tabs (live) — `/entities/[id]?type=` with real scope-grouped attributes and a live-updating telemetry tile + historical chart (see `.paul/phases/06-entity-views/06-02-SUMMARY.md`)
- [x] 06-03: Entity detail page — Alarms + Map tabs (live) + global Alarms page — real per-entity alarm list with live WS push, a conditional react-leaflet Map tab, and a filterable global `/alarms` page, all verified against real ThingsBoard Cloud data (see `.paul/phases/06-entity-views/06-03-SUMMARY.md`)

### Phase 6.4: Fleet map view — custom markers, clustering, nav entry [INSERTED]

**Goal:** A modernized alarm-colored marker for the existing per-entity Map tab, a new "Maps" nav entry showing every real Device with lat/long on one map, and marker clustering for dense areas (à la ThingsBoard) — see `.paul/phases/6.4-fleet-map-view/CONTEXT.md` for full discussion.
**Depends on:** Phase 6 (extends `MapWidget.tsx`, `react-leaflet`, `useTelemetryKeys`/`useTelemetryLatest`, `useEntityAlarms`)
**Reason:** User-requested extension after using the Phase 6 Map tab, discussed interactively before planning.

**Scope (confirmed 2026-08-02):**
- Fleet map covers Devices only (not Assets) for now
- Custom marker colored by alarm state (green = no active alarm, red/amber = active alarm), shared between the fleet map and the existing per-entity Map tab
- Pin click opens a popup (name, ALL telemetry keys + values with a scroll container, last report time, "Details" button → `/entities/[id]?type=DEVICE`) — no direct-navigate-on-click
- Clustering via `react-leaflet-cluster`
- No backend changes — client-side composition of existing hooks (N+1 fetch acceptable at current 4-device scale)

**Plans:**
- [x] 6.4-01: Shared alarm-colored `EntityMapMarker` (refactors the per-entity Map tab) + fleet map with clustering + new "Maps" nav entry — applied and unified, verified live against real ThingsBoard Cloud data; also shipped a white/color map tile toggle and a barely-visible popup scrollbar per live user feedback (see `.paul/phases/6.4-fleet-map-view/6.4-01-SUMMARY.md`)

### Phase 6.5: Main Dashboard — fleet summary, counts, map, tables, alarms [INSERTED]

**Goal:** The Dashboard nav item (currently `ComingSoon`) becomes a real summary view — Devices/Assets/active-alarms counts, the fleet map, a Devices table, and an active-alarms table, all reusing Phase 6/6.4 components, plus a visual seam for future dashboards. Must ship before Phase 7 — see `.paul/phases/6.5-main-dashboard/CONTEXT.md` for full discussion.
**Depends on:** Phase 6, Phase 6.4 (reuses `FleetMapWidget`, `EntityListWidget`, `AlarmsListWidget`, `useEntities`, `useGlobalAlarms`)
**Reason:** User-requested, explicitly required before Phase 7 — the Dashboard is the sidebar's first item and currently a placeholder.

**Scope (confirmed 2026-08-02):**
- Counts: Devices total, Assets total, active alarms (ACTIVE_UNACK+ACTIVE_ACK) — no Customers count
- Devices table only (not Assets), reusing `EntityListWidget` as-is
- Active-alarms table only (not full history), reusing `AlarmsListWidget` fed a client-filtered array
- Fleet map reused as-is from Phase 6.4 (`FleetMapWidget`)
- A visual-only seam (selector/tab showing "Main Dashboard") anticipating future dashboards — no real multi-dashboard logic, no persistence, no backend changes
- User-creatable/shareable custom dashboards (a separate, larger ask raised in the same conversation) are explicitly deferred to Version 2/3 — this phase is the single fixed main dashboard only, not a dashboard-builder system

**Plans:**
- [x] 6.5-01: `CountTileWidget` + fleet counts + non-functional future-dashboards seam + fleet map + Devices table + active-alarms table — applied, verified live against real ThingsBoard Cloud data (4 Devices, 1 Asset, 0 active alarms at verification time) and unified (see `.paul/phases/6.5-main-dashboard/6.5-01-SUMMARY.md`)

### Phase 7: Client creation wizard UI + Asset creation flow

**Goal:** An admin can create a Client and define its hierarchy from the frontend (matching the backend wizard from Phase 4), and separately create Assets linked into an existing Client's hierarchy (matching Phase 4.3's backend). Device creation/linking is explicitly out of scope — no backend support exists, deferred to V2 (confirmed with user 2026-08-03).
**Depends on:** Phase 4, Phase 4.3, Phase 5, Phase 6 (Assets list)
**Research:** Unlikely (standard multi-step form; `react-hook-form`/`zod` need to be added — despite this roadmap previously claiming they were "already in stack", they are not present in `frontend/package.json`)

**Scope (confirmed 2026-08-03, see `.paul/phases/07-client-wizard-ui/CONTEXT.md`):**
- Two separate flows, not one combined wizard: (1) Client-creation wizard (basic info → hierarchy level definition, add/reorder/rename → review → submit), (2) a separate "Add Asset" flow for an existing Client (pick Customer → hierarchy level → parent → submit)
- Client-side validation mirroring backend (hierarchy required, immutable after submit — UI makes this explicit)
- No backend changes — both flows consume existing `POST /customers` (Phase 4) and `POST /assets` (Phase 4.3) endpoints as-is

**Plans:**
- [x] 07-01: Clients list page + Client creation wizard (info → hierarchy → review), wired to `POST /customers` — applied, verified live against real ThingsBoard Cloud (created a real Customer with a 2-level hierarchy) and unified (see `.paul/phases/07-client-wizard-ui/07-01-SUMMARY.md`)
- [x] 07-02: "Add Asset" flow (Customer → level → parent picker) on `/assets`, wired to `POST /assets` — applied, verified live (created a real level-0 Asset parented to the Customer, then a real level-1 Asset parented to it) and unified (see `.paul/phases/07-client-wizard-ui/07-02-SUMMARY.md`)

### Phase 8: Admin hierarchy management panel [V2, first phase]

**Goal:** A new "Admin" nav section where a user picks a Client (breadcrumb-navigable into sub-clients), sees that Client's Asset hierarchy as a drillable tree, and sees/manages real ThingsBoard Devices linked to whichever node (Client or Asset) is currently selected — add/delete Customers, add/delete/edit Assets, assign/unassign Devices, all from one view. "Create Client"/"Add Asset" buttons removed from `/clients`/`/assets` (creation moves here).
**Depends on:** Phase 7 (reuses `useCustomers`, `ClientWizard`, `AddAssetModal`'s patterns, `useCreateAsset`/`useDeleteAsset`/`useDeleteCustomer`, `ConfirmDialog`)
**Reason:** User-requested, discussed interactively 2026-08-03/04 after V1 shipped — first Version 2 feature. Confirmed via clarifying questions: Devices are real ThingsBoard Devices (not just the "Sensor" hierarchy-level name), Admin is a new nav section (not a `/clients`/`/assets` replacement), editing is Asset-only, Device row actions are assign/unassign only (no edit/delete-the-device).

**Scope (confirmed 2026-08-03/04, see `.paul/phases/08-admin-hierarchy-panel/CONTEXT.md`):**
- No Postgres schema changes — Device↔Asset/Customer↔Asset hierarchy reads are pure real TB "Contains" relations (project constraint: TB is the single source of truth)
- New backend: `parentCustomerId` exposed on Customer `EntityRef`, `GET /customers/:id/children` + `GET /assets/:id/children` (relation-based tree reads), `PATCH /assets/:id`, `POST`/`DELETE /assets/:id/devices(/:deviceId)` (assign/unassign), `AssetsService.delete()` now blocks if the Asset has children
- New frontend: `/admin` page, breadcrumb Customer/Asset columns, Device panel (assign/unassign only)

**Plans:**
- [x] 08-01: Backend (parentCustomerId, relation-tree reads, Asset PATCH, Device link/unlink, delete-with-children guard) — applied, all 5 ACs verified live against real ThingsBoard Cloud, no Postgres changes (see `.paul/phases/08-admin-hierarchy-panel/08-01-SUMMARY.md`)
- [x] 08-02: Frontend admin panel (breadcrumb Customers/Assets/Devices columns, add/delete/edit/assign/unassign, remove old create buttons) — applied, `tsc` clean, verified via route/render checks + re-confirmed backend contract live (see `.paul/phases/08-admin-hierarchy-panel/08-02-SUMMARY.md`)
- [x] 08-03 (chat-driven follow-up, not a formal plan doc, 2026-08-04): Redesigned `/admin` from the fixed 3-breadcrumb-column layout into hierarchy-driven Miller columns — one HeroUI `Table` column per Client hierarchy level (Site/Area/Asset/…), always shown up front (falls back to the default Site→Area→Asset→Sensor set before a Client is picked), populated progressively as each level is selected, ending in a Devices column named after the last level. Asset creation forms simplified (dropped the free-text Type field — now auto-set to the level name — kept Name + optional Label). Clients table now keeps the selected Client visible as a row (not just in the breadcrumb) alongside its sub-Clients. Moved nav entry to right under Dashboard, full-width responsive grid layout. Fixed a real bug in `api-client.ts` (empty 201 bodies on link/unlink were throwing a non-`ApiError` client-side parse error, masking successful requests as "Unknown error" and skipping cache invalidation) and switched error messages to surface the backend's real `message` instead of `response.statusText`. Replaced HeroUI's `Modal`/`Select`/`Toast` with a custom Radix UI + framer-motion `Dialog`/`Select` (`frontend/src/components/`) and the `sonner` toast library (HeroUI's own Toast rendered unstyled/black and overlapped the sidebar) — `ConfirmDialog`, `ClientWizard`, and the Assign Device modal all migrated. No backend changes. `tsc --noEmit` clean throughout.

### Phase 9.1: Visual modernization

**Goal:** Move the app's look from the Phase 5/6 dark-navy/electric-blue rail to a lighter, glassmorphic, purple/indigo-accented design (from a shared reference mockup) — restyle every screen except the map-based ones, pure visual/styling pass, no new data/routes/behavior.
**Depends on:** Phase 5-8 (restyles their existing components in place)
**Reason:** User-requested, split from a larger ask alongside Phase 9.2 (roles/users) and Phase 10 (dashboards) — purely visual, no functional dependency on either.

**Scope (see `.paul/phases/09-visual-and-roles/9.1-visual-modernization/CONTEXT.md`):**
- Light glass design tokens (`--color-surface: #eef0f6`, translucent `.glass-card` surfaces), Inter font, **dark mode removed entirely** (not made a variant — `useTheme.ts` deleted, the toggle removed)
- Sidebar/header restyle (dark purple/indigo gradient rail, accent-gradient active nav pill), Login split-screen restyle
- Reusable `Skeleton`/`StatTileSkeleton`/`TableRowsSkeleton` system replacing `Spinner` loading states across `CountTileWidget`/`EntityListWidget`/`AlarmsListWidget`
- Shared `Dialog`/`Select` restyled to glass (cascades to every consumer), Admin Miller-column panels, entity-detail tabs, global Alarms page
- **All map-based UI explicitly excluded** (fleet `/maps`, per-entity Map tab, Dashboard's embedded map) — confirmed untouched via `git diff --stat` at the end of every plan

**Plans:**
- [x] 9.1-01: Light glass design tokens + Inter font + dark-mode removal, Sidebar/AppLayout restyle, Login split-screen restyle — applied, `tsc --noEmit` clean (see `9.1-01-SUMMARY.md`)
- [x] 9.1-02: Reusable Skeleton system + Dashboard restyle (`CountTileWidget` accent badges, `EntityListWidget`/`AlarmsListWidget` glass cards + skeletons) — applied, `tsc --noEmit` clean (see `9.1-02-SUMMARY.md`)
- [x] 9.1-03: Shared Dialog/Select restyle, Admin Miller-column panel, entity-detail tabs, global Alarms page — applied, `tsc --noEmit` clean, map exclusion confirmed via `git diff --stat` (see `9.1-03-SUMMARY.md`)
- Chat-driven follow-up (same milestone, not new plan files, see STATE.md Decisions/Addenda): after the light-glass restyle shipped, several dark-theme palette iterations followed (control-room cyan/violet → steel-blue/orange → deep violet → back to a lighter cyan/violet, the current state) — all pure `:root` token swaps, plus a few one-time structural fixes (dark-friendly low-opacity variants for previously light-only error/severity colors, Admin Miller-column grid/contrast fixes, `FleetMapWidget` loading-indicator fix). Map styling untouched throughout.

### Phase 9.2: Roles enforcement & user management

**Goal:** `READER` accounts are actually blocked from writing (not just labeled), a sysadmin can manage `admin`/`reader` Customer Users from the frontend (create/list/delete, across all Clients or one), and a sysadmin can impersonate any Customer User ("Login as") with a durable audit trail.
**Depends on:** Phase 2.2 (TB-native users/roles), Phase 8 (`/admin` panel patterns reused for `/users`)
**Reason:** User-requested, discussed via `/paul:discuss` before planning (see `9.2-roles-permissions-users/CONTEXT.md`). Two design decisions resolved via `AskUserQuestion` before planning: (1) `Users` is a new top-level nav item (already existed as a `comingSoon` placeholder); (2) impersonation has no live kill-switch — ending is always "Back to my session" on the impersonating browser, plus normal session TTL expiry.

**Scope:**
- `ReaderBlockGuard`: new global `APP_GUARD` (third, after `SessionAuthGuard`/`CustomerScopeGuard`) — 403s every mutating request from a READER session, zero exceptions
- `/users` page: Client picker (defaults to "All Clients" tenant-wide, added mid-session) + user list with role badges + Add/Delete, backed by `GET/POST/DELETE /users`
- Impersonation: `ImpersonationLog` Prisma model (audit trail only, not general audit logging), `POST /users/:id/impersonate` + `POST /users/impersonate/:logId/end` (both sysadmin-only), a persistent "Viewing as {email}" banner + "Back to my session" on the frontend
- Chat-driven follow-up (see `9.2-03-SUMMARY.md`'s Addendum): client-side role-based UI gating (new `GET /auth/me`, write controls hidden — not disabled — for READER), a real bug fix (ThingsBoard's activation-link endpoint returns plain text, not JSON), several code-review fixes, and a Tooltip component rewrite (portal-based via `@radix-ui/react-tooltip`, fixing a real scroll/clipping bug)

**Plans:**
- [x] 9.2-01: `ReaderBlockGuard` (backend-only) — applied, `tsc --noEmit` clean; live 403 verification deferred (no READER test account at the time), later exercised indirectly through the user's own live testing this session (see `9.2-03-SUMMARY.md` Addendum)
- [x] 9.2-02: Users management UI (`/users` list/create/delete, `appRole` exposed on `GET /users`) — applied, then extended mid-session with an "All Clients" default view backed by TB's real `GET /api/customer/users` (confirmed live against this project's tenant)
- [x] 9.2-03: Impersonation (`ImpersonationLog`, impersonate/end endpoints, banner + Login-as button) — applied; see its SUMMARY.md's substantial Addendum for the rest of this session's work (role-based UI gating, bug fixes, Tooltip rewrite) that closed out the phase

### Phase 10: User-editable dashboards (builder)

**Goal:** Admin/sysadmin users can create custom dashboards, drag/resize widgets on a grid, and add widgets one at a time or in bulk — materially simpler than ThingsBoard's own dashboard editor, targeting a ≤5-minute build time for a typical (~5-8 widget) dashboard. The fixed Main Dashboard (Phase 6.5) stays exactly as-is; custom dashboards are additional, reached via the Sidebar's dashboard selector.
**Depends on:** Phase 6/6.4 (reuses `ValueTileWidget`/`LineChartWidget`/`AttributesTableWidget`/`AlarmsListWidget`/`MapWidget`/`FleetMapWidget` as-is), Phase 6.5 (extends its dashboard-selector seam), Phase 9.2 (`ReaderBlockGuard` already covers dashboard write-blocking for READER with no new guard needed)
**Reason:** User-requested, discussed via `/paul:discuss` across several sessions (see `.paul/phases/10-dashboard-builder/CONTEXT.md` for the full trail: simplicity vs. ThingsBoard, AI/template/new-widget-type extensibility left as architectural readiness only, the `PRIVATE`/`SHARED` + `ALL`/`SPECIFIC` sharing model, and the ≤5-minute/bulk-add requirement).

**Scope (see CONTEXT.md for full discussion):**
- New Prisma models: `Dashboard` (title, `visibility: PRIVATE|SHARED`, `customerScope: ALL|SPECIFIC`), `DashboardCustomerAccess` (join table, one row per assigned Customer, cascades to descendants via the existing `isDescendantCustomer` hierarchy walk), `DashboardWidget` (`widgetType` + `config`/`layout` JSON)
- Backend `dashboards` module: registry-based widget-type validation (Zod per type, `backend/src/dashboards/widget-registry.ts`), scoped list/get/create/save/delete, one atomic transaction for the whole-dashboard save (`PUT /dashboards/:id`) — no partial writes
- Frontend: `react-grid-layout` canvas (`/dashboard/[id]`, `/dashboard/new`), a frontend widget registry mirroring the backend's, one-by-one Add-widget panel, bulk-add (pick one entity, check several telemetry keys, add them all as one batch), Sidebar's dashboard selector now populated from `GET /dashboards` instead of a hardcoded array
- No new widget types, no templates, no AI generation built in this phase — all three left as registry/schema-level architectural readiness per explicit user direction

**Plans:**
- [x] 10-01: Backend foundation — Prisma schema, widget-type registry, `dashboards` module (list/get/create/save/delete, visibility+scope enforcement) — applied, `tsc --noEmit` clean, migrated against real local Postgres, AC-1/AC-2/AC-5 (schema, widget validation, atomic save) verified live via curl; AC-3/AC-4 (cross-customer 403, non-sysadmin ALL-scope block) verified by code review only, no working non-sysadmin test account this session (see `10-01-SUMMARY.md`)
- [x] 10-02: Frontend base builder — `useDashboards` hooks, frontend widget registry + `DashboardWidgetRenderer` (with an "entity unavailable" fallback), `DashboardCanvas`/`AddWidgetPanel`, `/dashboard/[id]` page, dynamic Sidebar dashboard selector — applied, `tsc --noEmit`/`next build` clean; **not click-tested in a real browser** (see `10-02-SUMMARY.md`)
- [x] 10-03: Bulk-add — `packWidgets` row-packing helper (shared with `AddWidgetPanel`), `BulkAddPanel` (entity → telemetry-key checklist → widget type → "Add N widgets"), wired into the dashboard page — applied, `tsc --noEmit`/`next build` clean, packing math verified directly; **not click-tested in a real browser** (see `10-03-SUMMARY.md`)

**Outstanding before this phase is fully done:** a real browser session to click through create → add widget (one-by-one and bulk) → save → reload, for both `/dashboard/new` and an existing dashboard, plus a working non-sysadmin test account to verify AC-3/AC-4's cross-customer scoping live.

#### Builder extensions (10-04 onward, planned 2026-08-05)

A large chat-driven pass ran after 10-03 (see STATE.md Addendum 3) and surfaced a further set of
builder gaps. Scoped interactively with the user, who explicitly **cut white-labeling/tenant
theming and all react-grid-layout work (configurable column count + responsive breakpoints)** from
this round. The remainder is split by data-model risk — three plans, not one, because states and
aliases each change a different persisted shape:

- [ ] 10-04: Widget titles (`config.title`), widget click actions (`config.action`, entity-details
  navigation via a shared `widget-actions.ts` seam), and a dashboard-wide time window
  (`Dashboard.timeWindow`, nullable for back-compat) that every timeseries widget inherits instead
  of the hardcoded 1 hour in `defaultHistoryWindow()`. Carries a **blocking human-verify
  checkpoint** — this is the first plan to force the browser click-through that Phase 10 has owed
  since 10-01. See `10-04-PLAN.md`
- [ ] 10-05: Dashboard states/tabs — several named views per dashboard (ThingsBoard's
  "Overview / Live Monitor / History" shape) instead of N separate dashboards. Schema change:
  widgets gain a state association. Unblocks `action: 'NAVIGATE_STATE'`, deliberately left out of
  10-04's action enum so there is no dead option in the UI
- [ ] 10-06: Reusable entity aliases — today `entityScope: 'ALL'` is effectively a single-filter
  alias repeated inline in every widget's config. This defines an alias once at dashboard level
  (filter by device type / relation / group) and references it from many widgets

**Note:** the "More dashboard widget types (gauges, other chart/card variants)" row in the Version 2
table below is now **stale** — a `gauge` and a `value-cards` widget were both built in the same
chat-driven pass, along with configurable table columns (`dataKeys`), a dynamic `entityScope: 'ALL'`
binding, and a widget context menu/edit flow. None of it has a SUMMARY yet.

### Phase 12: Telemetry unit system + new widget types

**Goal:** Every widget that renders a telemetry value can carry a real unit (catalog-backed, not free text limited to 5 of 17 types), rendered through one shared formatter instead of two duplicated ones — plus five new widgets (progress-bar gauge style, stacked bar, sparkline tile, a multi-key comparison chart, and a static label/text widget).
**Depends on:** Phase 10 (extends `backend/src/dashboards/widget-registry.ts`, `frontend/src/dashboards/renderer/`, `frontend/src/dashboards/widget-config/`)
**Reason:** User-requested, discussed interactively 2026-08-12 (dashboard widget-gallery categorization work led into "what other widgets can I add" and then into units). Plan explored via two Explore agents + a Plan agent, decisions locked via `AskUserQuestion` before planning.

**Scope (see plan content below — this phase runs after Phase 11 testing harness, per explicit user sequencing):**
- Unit catalog as a frontend-only code module (`frontend/src/lib/units.ts`) — no DB tables, no per-tenant catalog; stores the display **symbol** (`'°C'`), not an id, so every already-saved `DashboardWidget.config` stays valid with zero migration
- `unit`/`decimals` promoted from a per-type field (5 of 17 widgets) to the shared `presentation` fragment in `backend/src/dashboards/widget-registry.ts` — all 17 types accept it
- One formatter (`frontend/src/lib/format.ts`), replacing the two duplicates (`formatTelemetryValue` and `chart-shared.ts`'s `formatValue`)
- Catalog-backed unit picker in the Add-widget config panel, with a free-text "Custom…" escape hatch and key-name auto-suggestion
- Two widgets added as config flags, not new types: progress-bar (`gauge.style: 'BAR'`), stacked bar (`bar-chart.stacked`)
- Three genuinely new widget types: sparkline tile (as a `value-tile.sparkline` flag per plan pushback — cheaper than a full new type), a multi-key comparison chart (dual-axis, grouped by resolved unit), and a static label/text widget (no datasource, plain text, no markdown dependency)
- **Explicitly out of scope:** per-user/per-category unit preferences (no Prisma model, no settings UI — the catalog module needs no consumer to exist yet, additive later), unit conversion (`factor`/`offset`, would ride along with preferences when built), and an iframe/embed widget (clickjacking/exfiltration risk on customer-shared dashboards, no concrete use case yet)

**Plans:**
- [ ] 12-01: TBD — to be broken into concrete plan(s) at `/paul:plan` time. Full phased design (5 sub-phases: catalog+formatter, config-panel picker, cheap widget flags, multi-key units + comparison chart, label widget) recorded in the approved Claude Code plan file from the 2026-08-12 session — bring that content into the formal PLAN.md at planning time rather than re-discussing from scratch.

## Version 2 (Not yet planned)

Deferred scope, pulled from PROJECT.md "Planned (Next — Version 2)" and STATE.md Deferred Issues. Not phase-numbered or scheduled — surfaced here so it isn't lost, to be broken into real phases when V1 ships.

| Item | Origin | Effort | Notes |
|------|--------|--------|-------|
| Área/asset-level permission granularity (finer than customer hierarchy) | PROJECT.md V2 scope / Phase 2.2 clarification | M | No design chosen yet — ThingsBoard CE has no Entity Groups to back it; would need either a TB PE upgrade or a parallel Postgres permission layer, a real architectural decision to make when picked up. Explicitly still deferred, Phase 9.2 (complete) only enforces role/customer-hierarchy scoping |
| DELETE endpoints for devices/assets/customers | STATE.md Deferred Issues (Phase 2.1) | S | Add when a V2 wizard needs entity deletion |
| Jest test harness for `ThingsboardClientService`/cache-hit/auth-guard behavior | STATE.md Deferred Issues (Phase 1-2.1) | S | Deferred per explicit instruction until backend V1 is done — manual runtime verification covers V1 so far |
| Modify assets/devices "Contains" relations (relocate to another asset/location area) + read Relations API generally | IMPROVEMENTS.md | M | Extends the internal-only relations use from `CustomerScopeGuard` into a general read/write Relations capability |
| Maps/photos per asset/device/location-area with child-only pins (one level deep) + navigation dashboard w/ status/type filters | IMPROVEMENTS.md | L | Frontend-heavy; needs a place to persist map/photo refs, likely Postgres |
| Device Profiles / Asset Profiles access (read, eventually manage) | IMPROVEMENTS.md | M | TB alarm rules are defined at profile level — natural pairing with the V1 Alarms module (Phase 3) once profiles are picked up |
| Entity Groups for asset creation (set groups within owner) | IMPROVEMENTS.md | M | Only available while the current ThingsBoard Professional Edition trial (1 month, up to 5 sensors) is active — depends on that subscription continuing or a deliberate PE upgrade |
| User edit: attributes + customer reassignment; email-based activation w/ double password confirmation as an alternative to the existing activation-link flow | IMPROVEMENTS.md | M | Extends Phase 2.2-02's `users` module (create/list/delete → add update + alternate activation flow). Note: user *management UI* (create/list/delete, all-Clients view) + impersonation shipped in Phase 9.2 (complete), not this row — this row is only the remaining edit/alt-activation gap |
| User profile fields (first/last name, phone, description) + default dashboard / fullscreen preference via `additionalInfo` | IMPROVEMENTS.md | M | Dashboard preference now has a real `Dashboard` model to point at (Phase 10, complete) — not yet wired to user `additionalInfo` |
| Dashboard templates (save-as-template / start-from-template) | Phase 10 CONTEXT.md, deferred by explicit user decision | M | Phase 10's `widgetType` registry + `Dashboard`/`DashboardWidget` split were deliberately shaped to make this additive later, not built |
| More dashboard widget types (gauges, other chart/card variants) | Phase 10 CONTEXT.md, deferred by explicit user decision | M | Phase 10's registry (backend Zod schemas + frontend UI metadata) is designed so a new type is one entry, not a rework — none built yet |
| AI-assisted dashboard generation (prompt → dashboard config) | Phase 10 CONTEXT.md, deferred by explicit user decision | L | Phase 10's typed per-widget-type `config` JSON is the schema-readiness groundwork — no generation endpoint/LLM call built |
| Reporting module | IMPROVEMENTS.md | L | Explicitly deferred to the last stages of the project, lowest priority in this table |
| Audit Logs | IMPROVEMENTS.md | S | Not v1, not yet scheduled for v2 either — revisit when picked up. Phase 9.2 (complete) added a narrow `ImpersonationLog`, not general audit logging |

---
*Roadmap created: 2026-07-30*
*Last updated: 2026-08-05 (after Phase 10 — dashboard builder, code-complete; browser verification pending)*
