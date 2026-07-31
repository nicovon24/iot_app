---
description: "iot_app — architecture: system design, entity model, and V2 hybrid-schema intent"
type: Architecture
about: "iot-app"
---

# ARCHITECTURE — IoT Platform

> V1 scope/decisions live in `PROJECT.md`. This file covers system design end-to-end, including V2-deferred pieces (hybrid Postgres schema, granular roles) kept here as forward-looking intent, not current V1 behavior.

## System Overview

```
Frontend (Next.js) → NestJS (auth + business logic) → ThingsBoard (entities, telemetry, rule engine)
        ↑                        ↓
        └── WebSocket (live telemetry, proxied via NestJS)
                              ↓
                        PostgreSQL (hybrid metadata only)
```

ThingsBoard owns: Tenants, Customers (Clients), Assets, Devices, Attributes, Telemetry, Relations, Rule Chains, and — as of Phase 2.2 — Users/roles (sysadmin/admin/reader), see `PROJECT.md`.

PostgreSQL owns (V1: hierarchy definitions only; the rest is V2-deferred design intent, not yet built): hierarchy definitions, relation-type labels, telemetry catalog, dashboard configs, favorites, onboarding, alarm recipients.

## Real-Time Channel

WebSocket carries both **live telemetry** and **alarms** (Phase 3, not yet built). Dashboards subscribe to device/asset telemetry updates through it, and alarm events are pushed the same way when a user has a session open. The connection is proxied through NestJS (not opened directly against ThingsBoard) so TB credentials/session stay server-side.

Alarms are planned to **also** be delivered by email (`alarm_recipients`, V2) regardless of WebSocket delivery, so a user gets notified even without a dashboard open.

## Entity Model Summary

| Layer | Storage | V1 status |
| :--- | :--- | :--- |
| Tenant, Client (Customer), User | ThingsBoard native (sysadmin = Tenant Admin, admin/reader = Customer Users, `additionalInfo.appRole`) | Built (Phase 2.2) |
| Location / Area / intermediate | ThingsBoard Asset — `hierarchyLevelId` attribute + "Contains" relation | Planned (Phase 4/7) |
| Sensor / Gateway | ThingsBoard Device | Built (Phase 2) |
| Hierarchy labels per Client | `hierarchy_level_definitions` (Postgres) | Planned (Phase 4) — only Postgres table in V1 scope |
| Custom entity relations (beyond hierarchy) | ThingsBoard native (Relations) | V2 — label/icon in `relation_type_definitions` |
| Telemetry logical types | `telemetry_definitions` (global) | V2 — see `docs/adr/2026-07-25-telemetry-units.md` |
| Unit conversion | `unit_categories`, `unit_conversions` (global) | V2 |
| Per-user unit preference | `user_unit_preferences` | V2 |
| Alarm condition | ThingsBoard Rule Chain; recipients in `alarm_recipients` | V2 (alarms themselves are Phase 3; email recipients are V2) |
| Granular permissions | ~~`roles` + `user_role_assignments` (Postgres)~~ — **superseded 2026-07-31**: V1 permission scoping is TB-native customer hierarchy (sysadmin/admin/reader), no parallel Postgres roles table. See `PROJECT.md` Key Decisions. | Superseded — kept here only as history; do not build |

> The concrete DB schema file (`docs/schema.dbml`) was removed as stale — it described the full V2-era hybrid schema (roles, dashboards, catalogs) ahead of any of it being built, and had already drifted from the TB-native roles decision. Re-derive it from this table when Phase 4+ actually needs it.

## Entity Relations Beyond Hierarchy (V2)

The hierarchy tree uses a single reserved relation type ("Contains") for parent/child links. Users also need relationships that aren't parent/child — e.g. a sensor that "Feeds" a tank, a pump that "Powers" a line, a gateway that "Monitors" an area.

- Fully native: any relation type between any two ThingsBoard entities uses TB's own Relation API — no new relation storage.
- Hybrid: per-Client display labels/icons for these custom relation types would live in `relation_type_definitions` (same pattern as `hierarchy_level_definitions`), so the frontend shows friendly names instead of raw TB relation-type strings.
- "Contains" stays reserved for the hierarchy tree/breadcrumb view; every other relation type would feed a separate, generic relations view.

## Dashboard Visibility & Permissions (V2)

Not built in V1. Original intent, kept for when V2 dashboards are planned: permissions would scope **which dashboards a user/role can see**, not which widgets they can use, via `roles.permissions` (jsonb) for default-type visibility (entity/solution/custom) per role, plus `dashboard_configs.visible_to_role_id` to target a specific role — set by whoever creates it (`created_by`), who always keeps view/edit access. This predates the Phase 2.2 TB-native roles decision and would need reconciling with sysadmin/admin/reader before being built, not implemented as originally drafted.

## Onboarding Wizards

V1 has exactly one wizard: **Client creation + static hierarchy assignment** (Phase 4/7) — see `PROJECT.md`. Everything below is V2-deferred:
- Asset creation
- Device creation + linking — creating a device also creates its structure (assets under it via `hierarchy_level_definitions` + "Contains" relations), from a default template rather than from scratch each time.

No new tables required beyond `hierarchy_level_definitions` when these ship — reuses it as the structure template.

## Data Classifier (V2)

Visualization suggestion per telemetry key, once `telemetry_definitions` exists, combines:

1. Native ThingsBoard data type
2. Unit from `telemetry_definitions` / `unit_categories`
3. Name/type heuristics (fallback)

## Reference Telemetry Case

Initial emulated device profile: an industrial pump/station. Used to seed `telemetry_definitions` (V2) and exercise the Data Classifier end to end before real sensors are connected.

Keys: `alarmCode`, `energy`, `flowRate`, `latitude`, `longitude`, `mode`, `motorSpeed`, `power`, `pressure`, `state`, `temperature`, `vibration`, `volume`.

## Rate Limiting

Only the login endpoint is throttled (brute-force protection on repeated auth attempts in a short window). No global rate limit — internal/authenticated traffic isn't constrained.

## Deployment Topology

| Component | Target |
| :--- | :--- |
| Frontend | Vercel |
| Backend | Render / Docker |
| ThingsBoard | Cloud (dev) / Docker (local) |
| PostgreSQL | Managed / Docker Compose |

Details: `.paul/rules/infrastructure.md`

## ADR Index

Architecture Decision Records live in `docs/adr/`. This section indexes them.

| ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| — | [Telemetry definitions, unit catalog, and per-user preferences](../docs/adr/2026-07-25-telemetry-units.md) | Accepted (V2-deferred, not built) | 2026-07-25 |

When adding an ADR: create `docs/adr/NNN-short-title.md` and append a row here.

---
*ARCHITECTURE.md — moved into `.paul/` 2026-07-31, reconciled with Phase 2.2 TB-native roles decision*
