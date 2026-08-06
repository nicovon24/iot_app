---
description: "Prove ThingsBoard can power a product with a frontend and API far more capable than ThingsBoard's native UI"
type: Project
about: "iot-app"
---

# IoTArg (iot_app)

## What This Is

An industrial IoT platform that uses ThingsBoard as the data engine (tenants, customers, assets, devices, telemetry, alarms, rule chains) behind a purpose-built NestJS API and a Next.js frontend. Target users are industrial operators/administrators (UI in Spanish, docs/code in English). Initial data source is emulated devices/assets in ThingsBoard (reference case: a pump/station profile) — no physical hardware required.

## Core Value

Industrial operators can view live and historical telemetry/attributes/alarms for any entity, on a frontend far more flexible than ThingsBoard's native UI, without ThingsBoard credentials ever reaching the browser.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | v2.0 (in progress) — v1.0 complete |
| Status | Prototype |
| Last Updated | 2026-08-05 (after Phase 10 — dashboard builder, code-complete) |

## Requirements

### Core Features (Version 1)

- Dynamic entities API mirroring ThingsBoard's own model — look up any entity (Device/Asset) by id/type, and any attribute/telemetry key by name, without hardcoding key sets per device type
- Live telemetry and live alarms via WebSocket, proxied through the backend (ThingsBoard credentials stay server-side)
- Attributes view (CLIENT/SERVER/SHARED scope) per entity
- Map view (lat/long) per entity when available, plus a fleet-wide map showing every Device with location on one clustered view
- Redis cache layer: ThingsBoard JWT + recent telemetry/attribute reads, to reduce load on ThingsBoard and the DB
- Client creation wizard: "Client" IS ThingsBoard's native Customer — creates a real TB Customer and assigns its hierarchy (default suggestion: Site → Area → Asset → Sensor) in one step, the **only** wizard in V1. Hierarchy is static after creation (not editable later)
- User/role model backed natively by ThingsBoard: sysadmin (TB Tenant Admin, pre-existing, never created/deleted via the app), admin/reader (TB Customer Users, created by the app, scoped to one customer). Scoping enforced at the customer boundary only — see Constraints
- Next.js frontend with nav (Devices, Assets, Alarms, Dashboard placeholder), entity detail view (tabs: Attributes / Telemetry / Alarms / Map)

### Validated (Shipped)

- [x] Project docs scaffold (VISION, ARCHITECTURE, STACK, schema.dbml, rules, agents) — pre-V1
- [x] Backend/frontend folder scaffolding (NestJS module layout, Next.js App Router layout) — 2026-07-30
- [x] Dynamic entities/attributes/telemetry REST API + TB-native auth, users, customer-hierarchy scoping — 2026-07-31
- [x] Live telemetry via WebSocket (`/ws/telemetry`), ThingsBoard credentials never reaching the browser — 2026-07-31 (Phase 3, 03-01)
- [x] Alarms REST (per-entity + customer-scoped global, filterable by severity/status) + live alarm push over WebSocket (`/ws/alarms`, polling-based) — 2026-07-31 (Phase 3, 03-02) — verified against a real ThingsBoard alarm created/cleared during testing
- [x] EntityRef reference fields (tenantId/customerId/assetProfileId/ownerId) enriched to `{id,name,label}`, batched + Redis-cached — 2026-07-31 (Phase 2.3)
- [x] Client creation wizard backend: `POST /customers` (sysadmin-only, atomically creates a real ThingsBoard Customer + its hierarchy levels in Postgres, keyed by the real `customerId`) + `GET /customers/:id/hierarchy` — 2026-08-01 (Phase 4) — Postgres/Prisma wired in for the first time in this project; verified live end-to-end against real ThingsBoard Cloud (see STATE.md Decisions "Client merged into Customer")
- [x] Real Asset↔Customer hierarchy linking (`parentCustomerId` on Customer creation, `AssetHierarchyAssignment` + real TB "Contains" relation on Asset creation), `POST /devices` removed entirely — 2026-08-02 (Phase 4.3)
- [x] Next.js frontend foundation: App Router scaffold with Tailwind v4 + HeroUI v2 (dark-navy/electric-blue theme, fully CSS-variable-driven for future white-labeling), icon-only sidebar nav, typed REST/WS API clients + TanStack Query, and a real login flow (sessionStorage-persisted session, client-side route gate, logout) — 2026-08-02 (Phase 5) — verified live end-to-end against the real running backend
- [x] Frontend entity views: real Devices/Assets list pages with row navigation, entity detail page (`/entities/[id]`) with live Attributes/Telemetry/Alarms tabs and a conditional Map tab (react-leaflet, shown only when an entity reports lat/long telemetry), and a real filterable global Alarms page — 2026-08-02 (Phase 6) — verified live end-to-end against the real running backend and real ThingsBoard Cloud data; also shipped app-wide dark/light mode, redesigned sidebar, and semantic text-color tokens (unplanned, user-requested during 06-01)
- [x] Fleet map view: alarm-colored map marker (shared between the per-entity Map tab and a new fleet-wide map) with a full-telemetry popup, a new "Maps" nav entry showing every real Device with location on one clustered map (`react-leaflet-cluster`), and a white/color map tile toggle — 2026-08-02 (Phase 6.4) — user-requested extension after using Phase 6's Map tab, verified live against real ThingsBoard Cloud data
- [x] Main Dashboard: real fleet counts (Devices/Assets/active alarms), the clustered fleet map, a Devices table, and an active-alarms table, all composed from Phase 6/6.4 pieces with zero new backend calls, plus a non-functional visual seam anticipating future dashboards — 2026-08-03 (Phase 6.5) — verified live against real ThingsBoard Cloud data
- [x] Client creation wizard UI: `/clients` list + a 3-step wizard (info → hierarchy → review) creating a real Customer + hierarchy via `POST /customers`; plus an "Add Asset" flow on `/assets` (Client → hierarchy level → parent picker) creating real linked Assets via `POST /assets` — 2026-08-03 (Phase 7) — user-requested scope expansion beyond the wizard alone; Device creation/linking explicitly confirmed out of scope (no backend support, deferred to V2); both flows verified live against real ThingsBoard Cloud data, zero backend changes
- [x] **V1 milestone complete** (Phases 1-7 +6 inserted phases) — 2026-08-03
- [x] Admin hierarchy management panel: `/admin` — Miller-column view (Clients → per-level Assets → Devices) with add/delete/edit/assign/unassign from one screen, backed by real TB "Contains" relations (no Postgres schema changes); creation moved out of `/clients`/`/assets` into this one place — 2026-08-04 (Phase 8, first V2 phase) — verified live against real ThingsBoard Cloud
- [x] Visual modernization: light glassmorphic redesign (purple/indigo accents, `.glass-card` surfaces, Inter font, dark mode removed entirely), a reusable Skeleton loading system, and a full restyle of Sidebar/Login/Dashboard/Admin/dialogs/entity-detail/Alarms — every map-based screen explicitly excluded and confirmed untouched — 2026-08-05 (Phase 9.1) — further dark-theme palette iterations followed as chat-driven work after the initial light-glass ship (see STATE.md Decisions)
- [x] Roles enforcement & user management: `ReaderBlockGuard` (global, blocks every mutating request from a READER session), `/users` page (create/list/delete `admin`/`reader` Customer Users, defaults to an "All Clients" tenant-wide view backed by TB's real `GET /api/customer/users`), sysadmin "Login as" impersonation with a durable `ImpersonationLog` audit trail (no live kill-switch, by design), and client-side role-based UI gating (`GET /auth/me` + `usePermissions()` — READER's write controls are hidden, not just backend-blocked) — 2026-08-05 (Phase 9.2) — live-tested interactively by the user through the session (found and fixed 2 real bugs: a ThingsBoard plain-text response crash, and a Tooltip portal/scroll-clipping bug)
- [x] User-editable dashboards (builder): `Dashboard`/`DashboardCustomerAccess`/`DashboardWidget` Prisma models (`PRIVATE`/`SHARED` visibility, `ALL`/`SPECIFIC` customer scope), a registry-based `dashboards` module (5 widget types, Zod-validated per type, one atomic whole-dashboard save transaction), and a `react-grid-layout` canvas builder (`/dashboard/[id]`, `/dashboard/new`) with a one-by-one Add-widget panel plus a bulk-add flow (pick an entity, check several telemetry keys, add them all at once) built to hit the ≤5-minute dashboard-building target — 2026-08-05 (Phase 10, all 3 plans: 10-01 backend, 10-02 frontend base, 10-03 bulk-add) — backend verified live via curl (create/save/validation/atomicity all confirmed against real Postgres); frontend verified via `tsc`/`next build`/dev-server route checks only, **not yet click-tested in a real browser** (no browser tool this session — flagged as the top follow-up)

### Active (In Progress)

- Phase 10 (dashboard builder) — code-complete, needs a real browser click-through session to close out the deferred live-UI verification (see 10-01/10-02/10-03 SUMMARY.md files) before being considered fully done
- Phase 11 (testing harness, backend + frontend) — discussed (`CONTEXT.md` written), not yet planned; recommended to run after Phase 10's browser verification closes out

### Planned (Next — Version 2)

- [x] ~~Asset creation wizard~~ — shipped (Phase 7's "Add Asset" flow, Phase 8's `/admin` panel)
- [x] ~~User-creatable/editable dashboards~~ — shipped (Phase 10), pending browser verification
- [ ] Device creation + linking wizard (link Device to Customer + Asset, default structure from `CustomerHierarchyLevels` template)
- [ ] Área/asset-level permission granularity (finer than customer hierarchy) — deferred, no design chosen yet since ThingsBoard CE has no Entity Groups to back it (see Constraints)
- [ ] Dashboard templates (save-as-template / start-from-template) — Phase 10 deliberately left the schema/registry shaped to allow this later, not built yet
- [ ] More dashboard widget types (gauges, other chart/card variants) — Phase 10's widget-type registry is designed for this, no new types built yet
- [ ] AI-assisted dashboard generation — Phase 10's typed per-widget-type config schema is designed to make this feasible later, no generation endpoint built

### Out of Scope (V1 and V2, per VISION.md)

- Custom domain / login-page branding — cosmetic, not needed to prove the PoC
- Replacing ThingsBoard's Rule Engine — alarms/rules stay native to TB
- Physical device onboarding flows — emulated devices only for now

## Target Users

**Primary:** Industrial operators and administrators
- Monitor sensors/assets in real time (flow, pressure, temperature, vibration, position, etc.)
- Need history/aggregates and flexible dashboards eventually (V2)
- UI in English (**revised 2026-08-02** — superseded the original "UI in Spanish" requirement per explicit user direction); not necessarily technical

## Context

**Business Context:** Personal/solo project, practicing a real NestJS + Next.js service end-to-end with former coworkers, using ThingsBoard as the IoT engine instead of building one from scratch.

**Technical Context:** ThingsBoard is the single source of truth for entities/telemetry/attributes/alarms — never duplicated in Postgres. "Client" is not an app-owned entity; it IS ThingsBoard's native Customer. Postgres is reserved for metadata ThingsBoard doesn't model at all: hierarchy level definitions keyed by real `customerId` (V1) and later dashboard configs, roles, catalogs (V2).

## Constraints

### Technical Constraints
- ThingsBoard entities/telemetry/attributes/alarms are never duplicated locally — always proxied
- Telemetry values are always serialized as strings in API responses (never JS `number`) — see `.paul/rules/api.md`
- Frontend never talks to ThingsBoard directly — always through the NestJS backend (REST + WS)
- Hierarchy is static once a Customer ("Client") is created — no hierarchy editing after creation in V1
- ThingsBoard instance is **CE (Community Edition)**, not PE — no native Entity Groups/Roles. V1 scoping follows the **customer hierarchy**: sysadmin (tenant) sees everything; a customer user sees everything under its own customer, including descendant sub-customers. Per-asset/área permission granularity (finer than hierarchy) has no TB-native mechanism and is deferred until a design is chosen

### Business Constraints
- Solo-dev project — plan/apply/unify loop (PAUL) sized for one person, no heavy subagent orchestration overhead

### Compliance Constraints
- None currently (no real client/industry data in V1 — emulated devices only)

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Frontend is Next.js (App Router), not plain Vite+React | User preference; also enables future BFF route handlers if needed | 2026-07-30 | Active |
| Redis included from V1 (not deferred) | Cuts repeated calls to ThingsBoard and DB for JWT + recent telemetry/attribute reads | 2026-07-30 | Active |
| Postgres/Prisma scoped narrowly in V1 to hierarchy-level metadata only — no local Client/Customer table | Only persistence actually needed for the wizard; Customer itself always lives in TB, never duplicated | 2026-07-30 | Active |
| Client-creation wizard is the only V1 wizard; hierarchy fixed at creation | Keeps V1 scope tight — Asset/Device wizards and hierarchy editing deferred to V2 | 2026-07-30 | Active |
| "Client" IS ThingsBoard's native Customer — not a separate app-owned entity | User clarified mid-Phase-4 that a parallel `Client` concept alongside TB's `Customer` was redundant and confusing; `CustomerHierarchyLevels` is keyed by the real TB `customerId` instead of a local id | 2026-08-01 | Active |
| API mirrors ThingsBoard's dynamic entity/attribute/telemetry model | Any telemetry/attribute key works without backend changes when new sensor types appear | 2026-07-30 | Active |
| GraphQL discarded in favor of REST + Swagger | See docs/project/STACK.md | 2026-07-25 | Active |
| Users are TB-native (sysadmin = TB Tenant Admin, admin/reader = TB Customer Users), not an app-owned users table | App is complementary to ThingsBoard identity, not a second source of truth for users | 2026-07-31 | Active |
| Permission scoping in V1 follows the customer hierarchy (tenant sees all; a customer sees itself + descendant sub-customers) — no finer granularity (TB CE has no Entity Groups) | Avoids inventing a parallel permission system before a real design for área/asset-level scoping is chosen; hierarchy-based scoping is a natural TB CE mechanism (sub-customers) | 2026-07-31 | Active |
| WebSocket gateways run on `@nestjs/platform-ws`'s `WsAdapter` over the existing Fastify HTTP server | Keeps standard Nest gateway/DI conventions instead of hand-rolling a Fastify WS route; one adapter serves both telemetry and alarm gateways | 2026-07-31 | Active |
| Customer-hierarchy scoping logic is a single shared function (`isEntityInScope`) used by both the REST `CustomerScopeGuard` and every WS gateway | Prevents REST and WS from drifting into two different authorization rules over time | 2026-07-31 | Active |
| Alarm live push uses ~7s polling+diff instead of ThingsBoard's native `alarmDataCmds` WS protocol | That protocol is materially more complex than telemetry's `tsSubCmds` and wasn't confirmed working within Phase 3's budget; revisit if Phase 6 needs lower latency | 2026-07-31 | Active |
| Local Postgres runs on host port 15432, not the 5432 default | Three native Windows PostgreSQL services were already bound to 5432/5433/5434 on the dev machine, silently intercepting Docker's forwarded connections | 2026-08-01 | Active |
| Prisma pinned to v6, not the current v7 | Prisma 7 requires driver adapters/`prisma.config.ts` instead of a plain `url` in the datasource block — a bigger architectural change than Phase 4 scoped | 2026-08-01 | Active |
| `POST /customers` creates the real TB Customer first, then hierarchy rows in Postgres; on Postgres failure the TB Customer is deleted (compensating action, not a true cross-store transaction) | TB has no transaction spanning both stores; this avoids leaving an orphaned Customer with no hierarchy | 2026-08-01 | Active |
| Default suggested hierarchy levels: Site → Area → Asset → Sensor | User-chosen naming for the Phase 7 wizard's default suggestion; still free-text per Customer, not enforced by the backend | 2026-08-01 | Active |
| **UI language switched to English, superseding the original "UI in Spanish" requirement** | Explicit user direction during Phase 5 frontend work | 2026-08-02 | Active |
| Global Alarms page relies on TanStack Query refetch-on-filter-change, not a tenant-wide WS subscription | `/ws/alarms` is entity-scoped by design (Phase 3); a tenant-wide alarm push protocol wasn't built and isn't needed for a filterable list | 2026-08-02 | Active |
| Map tab uses HeroUI `Tabs`' `isDisabled` instead of omitting the tab for entities without lat/long | Lets the user see the capability exists but isn't available for this entity, rather than hiding it entirely | 2026-08-02 | Active |
| Map marker/popup is one shared component (`EntityMapMarker`) used by both the per-entity Map tab and the fleet map, colored by alarm state (not severity-level granularity) | Avoids two divergent map implementations; matches the scope explicitly confirmed with the user before planning Phase 6.4 | 2026-08-02 | Active |
| Map tiles default to a white/light basemap (CartoDB Positron), with a toggle to switch to color OSM tiles | Explicit user request after seeing Phase 6's color map — white is the default "at rest" look | 2026-08-02 | Active |
| Impersonated sessions reuse the impersonator's own `tbToken`/`tbRefreshToken` rather than a second real TB login for the target user | Consistent with existing architecture — entity-scoped TB calls already go through the shared service-account credential regardless of whose app session is active, not the caller's own token | 2026-08-05 | Active |
| No live kill-switch for impersonation — a sysadmin can't forcibly end another active impersonation session from elsewhere, only "Back to my session" on the impersonating browser itself | Explicit scope cut, confirmed with the user before planning Phase 9.2 | 2026-08-05 | Active |
| Client-side role-based UI gating (READER's write controls hidden, not just backend-403'd) required adding `GET /auth/me` first | Superseded the Phase 7 decision to not build fake client-side role checks without a real endpoint backing them — that endpoint now exists | 2026-08-05 | Active |
| READER's write controls are hidden entirely, not shown disabled | Initial implementation used disabled-with-tooltip; user explicitly asked to switch to fully hidden | 2026-08-05 | Active |
| Dashboard sharing model is `visibility: PRIVATE\|SHARED` + `customerScope: ALL\|SPECIFIC` (+ `DashboardCustomerAccess` join table for one-or-more Customers), not a single `customerId` column | User asked mid-Phase-10-discussion whether a dashboard should target one, several, or all Customers, and whether a creator could keep one private | 2026-08-05 | Active |
| No ADMIN-vs-READER distinction within a `SHARED` dashboard's visibility | Explicit user decision, consistent with the project's standing "no per-role/per-area granularity without a real design" stance (see Área/asset-level permission granularity row) | 2026-08-05 | Active |
| Dashboard `widgetType` is a backend registry (Zod schema per type) + frontend registry (UI metadata per type), not a closed enum/switch — deliberately shaped so future gauges/templates/AI-generated configs are additive, not a rework | User asked to leave the door open for more widget types, templates, and AI-assisted generation without building any of them yet | 2026-08-05 | Active |
| Whole-dashboard save is one Prisma transaction (`PUT /dashboards/:id` replaces all widgets + customerAccess rows together) | User's explicit "sin errores" requirement — a partial-failure mid-save must never leave the grid inconsistent with the DB | 2026-08-05 | Active |
| Dashboard builder canvas uses `react-grid-layout@1.5.4` (classic API), not the current `2.x` rewrite | v2's hook-based API (`dragConfig`/`resizeConfig`, required numeric `width`) carried materially higher implementation risk than v1's well-documented `isDraggable`/`layout`/`onLayoutChange` shape, especially without a browser to click-test against this session | 2026-08-05 (Phase 10, 10-02) | Active |
| Bulk-add (pick one entity, check several telemetry keys, add them all as `value-tile`/`line-chart` widgets in one action) is the mechanism for the user's explicit ≤5-minute dashboard-building target, one entity at a time in v1 | User set the 5-minute target after reviewing a save/render diagram together and found the one-by-one flow wouldn't reliably hit it | 2026-08-05 (Phase 10, 10-03) | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Live telemetry latency (TB → frontend) | < 2s | Not measured | At risk |
| Entities API works for any Device/Asset without code changes per type | Yes | Not built | At risk |
| Client-creation wizard produces a usable hierarchy end-to-end | Yes | Backend complete (Phase 4); frontend pending (Phase 7) | On track |

## Tech Stack / Tools

| Layer | Technology | Notes |
|-------|------------|-------|
| Backend | NestJS + Fastify adapter | REST + Swagger, WS gateways for telemetry/alarms |
| Cache | Redis | ThingsBoard JWT cache + telemetry/attribute read cache (V1) |
| Database | PostgreSQL via Prisma (v6) | Hierarchy-level metadata only (keyed by real TB `customerId`), no local Customer/Client table; local instance on port 15432 |
| IoT Engine | ThingsBoard (Cloud dev / Docker local) | Devices, Assets, Telemetry, Attributes, Alarms, Rule Chains |
| Frontend | Next.js (App Router) + TypeScript | Zustand (UI state), TanStack Query (server state), Recharts, react-leaflet (map), react-grid-layout v1 (dashboard builder grid) |
| Package Manager | npm workspaces (root `package.json`) | `backend`, `frontend` |

## Links

| Resource | URL |
|----------|-----|
| Repository | https://github.com/nicovon24/iot_app (branch: `feature/admin`) |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-08-05 after Phase 10 (dashboard builder, code-complete — see Active for pending browser verification)*
