---
description: "Prove ThingsBoard can power a product with a frontend and API far more capable than ThingsBoard's native UI"
type: Project
about: "iot-app"
---

# IoT Platform (iot_app)

## What This Is

An industrial IoT platform that uses ThingsBoard as the data engine (tenants, customers, assets, devices, telemetry, alarms, rule chains) behind a purpose-built NestJS API and a Next.js frontend. Target users are industrial operators/administrators (UI in Spanish, docs/code in English). Initial data source is emulated devices/assets in ThingsBoard (reference case: a pump/station profile) — no physical hardware required.

## Core Value

Industrial operators can view live and historical telemetry/attributes/alarms for any entity, on a frontend far more flexible than ThingsBoard's native UI, without ThingsBoard credentials ever reaching the browser.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | v1 (in progress) |
| Status | Prototype |
| Last Updated | 2026-07-30 |

## Requirements

### Core Features (Version 1)

- Dynamic entities API mirroring ThingsBoard's own model — look up any entity (Device/Asset) by id/type, and any attribute/telemetry key by name, without hardcoding key sets per device type
- Live telemetry and live alarms via WebSocket, proxied through the backend (ThingsBoard credentials stay server-side)
- Attributes view (CLIENT/SERVER/SHARED scope) per entity
- Map view (lat/long) per entity when available
- Redis cache layer: ThingsBoard JWT + recent telemetry/attribute reads, to reduce load on ThingsBoard and the DB
- Client creation wizard: creates a Client and assigns its hierarchy in one step — the **only** wizard in V1. Hierarchy is static after creation (not editable later)
- Next.js frontend with nav (Devices, Assets, Alarms, Dashboard placeholder), entity detail view (tabs: Attributes / Telemetry / Alarms / Map)

### Validated (Shipped)

- [x] Project docs scaffold (VISION, ARCHITECTURE, STACK, schema.dbml, rules, agents) — pre-V1
- [x] Backend/frontend folder scaffolding (NestJS module layout, Next.js App Router layout) — 2026-07-30

### Active (In Progress)

- [ ] Backend V1 — see ROADMAP.md phases 1-4
- [ ] Frontend V1 — see ROADMAP.md phases 5-7

### Planned (Next — Version 2)

- [ ] Asset creation wizard
- [ ] Device creation + linking wizard (link Device to Client + Asset, default structure from `hierarchy_level_definitions` template)
- [ ] Roles and granular permissions (per-dashboard visibility, scoped by creator and target role)
- [ ] User-creatable/editable dashboards (`react-grid-layout`), full dashboard config persistence

### Out of Scope (V1 and V2, per VISION.md)

- Custom domain / login-page branding — cosmetic, not needed to prove the PoC
- Replacing ThingsBoard's Rule Engine — alarms/rules stay native to TB
- Physical device onboarding flows — emulated devices only for now

## Target Users

**Primary:** Industrial operators and administrators
- Monitor sensors/assets in real time (flow, pressure, temperature, vibration, position, etc.)
- Need history/aggregates and flexible dashboards eventually (V2)
- UI in Spanish; not necessarily technical

## Context

**Business Context:** Personal/solo project, practicing a real NestJS + Next.js service end-to-end with former coworkers, using ThingsBoard as the IoT engine instead of building one from scratch.

**Technical Context:** ThingsBoard is the single source of truth for entities/telemetry/attributes/alarms — never duplicated in Postgres. Postgres is reserved for metadata ThingsBoard doesn't model: hierarchy level definitions (V1) and later dashboard configs, roles, catalogs (V2).

## Constraints

### Technical Constraints
- ThingsBoard entities/telemetry/attributes/alarms are never duplicated locally — always proxied
- Telemetry values are always serialized as strings in API responses (never JS `number`) — see `docs/rules/api.md`
- Frontend never talks to ThingsBoard directly — always through the NestJS backend (REST + WS)
- Hierarchy is static once a Client is created — no hierarchy editing after creation in V1

### Business Constraints
- Solo-dev project — plan/apply/unify loop (PAUL) sized for one person, no heavy subagent orchestration overhead

### Compliance Constraints
- None currently (no real client/industry data in V1 — emulated devices only)

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Frontend is Next.js (App Router), not plain Vite+React | User preference; also enables future BFF route handlers if needed | 2026-07-30 | Active |
| Redis included from V1 (not deferred) | Cuts repeated calls to ThingsBoard and DB for JWT + recent telemetry/attribute reads | 2026-07-30 | Active |
| Postgres/Prisma scoped narrowly in V1 to hierarchy + Client only | Only persistence actually needed for the Client-creation wizard; avoids building unused tables early | 2026-07-30 | Active |
| Client-creation wizard is the only V1 wizard; hierarchy fixed at creation | Keeps V1 scope tight — Asset/Device wizards and hierarchy editing deferred to V2 | 2026-07-30 | Active |
| API mirrors ThingsBoard's dynamic entity/attribute/telemetry model | Any telemetry/attribute key works without backend changes when new sensor types appear | 2026-07-30 | Active |
| GraphQL discarded in favor of REST + Swagger | See docs/project/STACK.md | 2026-07-25 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Live telemetry latency (TB → frontend) | < 2s | Not measured | At risk |
| Entities API works for any Device/Asset without code changes per type | Yes | Not built | At risk |
| Client-creation wizard produces a usable hierarchy end-to-end | Yes | Not built | At risk |

## Tech Stack / Tools

| Layer | Technology | Notes |
|-------|------------|-------|
| Backend | NestJS + Fastify adapter | REST + Swagger, WS gateways for telemetry/alarms |
| Cache | Redis | ThingsBoard JWT cache + telemetry/attribute read cache (V1) |
| Database | PostgreSQL via Prisma | Hierarchy definitions + Client record only in V1 |
| IoT Engine | ThingsBoard (Cloud dev / Docker local) | Devices, Assets, Telemetry, Attributes, Alarms, Rule Chains |
| Frontend | Next.js (App Router) + TypeScript | Zustand (UI state), TanStack Query (server state), Recharts, react-leaflet (map) |
| Package Manager | npm workspaces (root `package.json`) | `backend`, `frontend` |

## Links

| Resource | URL |
|----------|-----|
| Repository | (local, not yet pushed) |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-07-30*
