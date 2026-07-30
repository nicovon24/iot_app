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
Status: Not started
Phases: 0 of 7 complete

## Phases

**Phase Numbering:** Integer phases run in order 1 → 7. Decimal insertions (e.g. 2.1) reserved for urgent work discovered mid-milestone.

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Backend foundation & ThingsBoard auth | TBD | Not started | - |
| 2 | Dynamic entities, attributes & telemetry API | TBD | Not started | - |
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
- [ ] 01-01: NestJS + Fastify + Redis + config scaffold
- [ ] 01-02: ThingsBoard client service (login/refresh) + JWT cache in Redis
- [ ] 01-03: Auth module (login/logout endpoints) + Swagger baseline

### Phase 2: Dynamic entities, attributes & telemetry API

**Goal:** Any Device/Asset can be looked up generically, and any attribute/telemetry key it has can be read — no hardcoded key lists per device type.
**Depends on:** Phase 1 (needs authenticated TB client)
**Research:** Likely (ThingsBoard's entity/attribute/telemetry REST contract, key-agnostic query design)

**Scope:**
- `entities/` module: `EntityRef` type unifying Device/Asset, `GET /entities?type=DEVICE|ASSET`, `GET /entities/:id`
- `devices/`, `assets/` modules: thin listing endpoints on top of `entities/`
- `attributes/` module: `GET /entities/:id/attributes?scope=CLIENT_SCOPE|SERVER_SCOPE|SHARED_SCOPE` — dynamic, returns whatever keys exist
- `telemetry/` module (REST part): `GET /entities/:id/telemetry/keys`, `GET /entities/:id/telemetry/latest`, `GET /entities/:id/telemetry/timeseries` — values serialized as strings per `docs/rules/api.md`
- Redis read-through cache for attributes/telemetry latest (short TTL, e.g. a few seconds) to cut TB + DB load
- Every endpoint documented in Swagger as it's built (DTOs decorated with `@ApiProperty`, responses typed) — Swagger UI is the primary way to test these endpoints, no Bruno/Postman collections

**Plans:**
- [ ] 02-01: Entities module (Device/Asset unification, listing, get-by-id) + Swagger docs
- [ ] 02-02: Attributes module (dynamic scope-based read) + Redis cache + Swagger docs
- [ ] 02-03: Telemetry REST module (keys/latest/timeseries) + Redis cache + string-serialization contract + Swagger docs

### Phase 3: Live telemetry & alarms (WebSocket gateways)

**Goal:** Frontend can subscribe to live telemetry and live alarms for a chosen entity without ThingsBoard credentials ever leaving the backend.
**Depends on:** Phase 2 (entities/telemetry REST already defined)
**Research:** Likely (ThingsBoard's own WS telemetry subscription protocol, proxying it cleanly through Nest)

**Scope:**
- `telemetry/telemetry.gateway.ts`: WS proxy — client subscribes by entity id, gateway subscribes upstream to ThingsBoard and relays updates
- `alarms/` module: `GET /entities/:id/alarms`, `GET /alarms` (global, filterable by severity/status), `alarms.gateway.ts` WS proxy for live alarm push
- Reconnect/backoff handling on the upstream TB WS connection
- Alarms REST endpoints documented in Swagger; WS gateways documented in Swagger's description/tags where supported (Swagger can't "try out" WS — note this limitation directly in the endpoint docs, plus a short `docs/rules/testing.md` note on using `wscat`/a test script for the gateways)

**Plans:**
- [ ] 03-01: Telemetry WebSocket gateway (subscribe/unsubscribe per entity)
- [ ] 03-02: Alarms REST endpoints (Swagger docs) + Alarms WebSocket gateway

### Phase 4: Client creation wizard & static hierarchy (Prisma/Postgres)

**Goal:** An admin can create a Client and assign its hierarchy levels in one flow; the hierarchy is fixed from that point on. This is the only wizard in V1.
**Depends on:** Phase 1 (auth), independent of Phases 2-3
**Research:** Unlikely (internal CRUD + Prisma schema, pattern already sketched in `docs/schema.dbml`)

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
