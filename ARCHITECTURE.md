# ARCHITECTURE — IoT Platform

## System Overview

```
Frontend (React) → NestJS (auth + business logic) → ThingsBoard (entities, telemetry, rule engine)
        ↑                        ↓
        └── WebSocket (live telemetry, proxied via NestJS)
                              ↓
                        PostgreSQL (hybrid metadata only)
```

ThingsBoard owns: Tenants, Customers (Clients), Assets, Devices, Attributes, Telemetry, Relations, Rule Chains.

PostgreSQL owns: hierarchy definitions, relation-type labels, telemetry catalog, dashboard configs, favorites, onboarding, alarm recipients, granular roles.

## Real-Time Channel

WebSocket carries both **live telemetry** and **alarms**. Dashboards subscribe to device/asset telemetry updates through it, and alarm events are pushed the same way when a user has a session open. The connection is proxied through NestJS (not opened directly against ThingsBoard) so TB credentials/session stay server-side.

Alarms are **also** delivered by email (see `alarm_recipients`) regardless of WebSocket delivery, so a user gets notified even without a dashboard open.

## Entity Model Summary

| Layer | Storage | Notes |
| :--- | :--- | :--- |
| Tenant, Client, User | ThingsBoard native | Clients nestable via Relations |
| Location / Area / intermediate | ThingsBoard Asset | `hierarchyLevelId` attribute + "Contains" relation |
| Sensor / Gateway | ThingsBoard Device | |
| Hierarchy labels per Client | `hierarchy_level_definitions` | Custom table |
| Custom entity relations (beyond hierarchy) | ThingsBoard native (Relations) | Any relation type between any two entities; label/icon in `relation_type_definitions` |
| Telemetry logical types | `telemetry_definitions` | Global, not per-device |
| Unit conversion | `unit_categories`, `unit_conversions` | Global |
| Per-user unit preference | `user_unit_preferences` | |
| Alarm condition | ThingsBoard Rule Chain | Recipients in `alarm_recipients` |
| Granular permissions | `roles` + `user_role_assignments` | Points to generic `tb_entity_id`; governs dashboard visibility per user/role, not widget access |

See `docs/schema.dbml` for hybrid table definitions.

## Entity Relations Beyond Hierarchy

The hierarchy tree uses a single reserved relation type ("Contains") for parent/child links. Users also need relationships that aren't parent/child — e.g. a sensor that "Feeds" a tank, a pump that "Powers" a line, a gateway that "Monitors" an area.

- Fully native: any relation type between any two ThingsBoard entities uses TB's own Relation API — no new relation storage.
- Hybrid: per-Client display labels/icons for these custom relation types live in `relation_type_definitions` (same pattern as `hierarchy_level_definitions`), so the frontend shows friendly names instead of raw TB relation-type strings.
- "Contains" stays reserved for the hierarchy tree/breadcrumb view; every other relation type feeds a separate, generic relations view.

## Dashboard Visibility & Permissions

Permissions scope **which dashboards a user/role can see**, not which widgets they can use. `roles.permissions` (jsonb, scoped via generic `tb_entity_id`) determines default-type visibility (entity/solution/custom) per role. A dashboard can also target a specific role via `dashboard_configs.visible_to_role_id` — set by whoever creates it (`created_by`), who always keeps view/edit access to their own dashboards regardless of role. The widget catalog (table, chart, map, etc.) is identical for every authenticated user on any dashboard they can already see — there is no per-role widget restriction.

Role types (manager, operator, admin, ...) are free-form per Client via `roles.name` — no fixed enum, since permission/visibility needs vary per Client.

## Onboarding Wizards (planned, near-term)

Admin-facing creation flows — not physical device provisioning (that stays out of scope, see VISION.md). Planned wizards:
- Client creation
- Asset creation
- Device creation + linking — creating a device also creates its structure (assets under it via `hierarchy_level_definitions` + "Contains" relations), from a default template rather than from scratch each time.

No new tables required for this — reuses `hierarchy_level_definitions` as the structure template; wizards are frontend/NestJS orchestration over existing ThingsBoard + hybrid tables.

## Data Classifier

Visualization suggestion per telemetry key combines:

1. Native ThingsBoard data type
2. Unit from `telemetry_key_catalog`
3. Name/type heuristics (fallback)

## Reference Telemetry Case

Initial emulated device profile: an industrial pump/station. Used to seed `telemetry_key_catalog` and exercise the Data Classifier end to end before real sensors are connected.

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

Details: `docs/rules/infrastructure.md`

## ADR Index

Architecture Decision Records live in `docs/adr/`. This section indexes them.

| ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| — | [Telemetry definitions, unit catalog, and per-user preferences](docs/adr/2026-07-25-telemetry-units.md) | Accepted | 2026-07-25 |

When adding an ADR: create `docs/adr/NNN-short-title.md` and append a row here.
