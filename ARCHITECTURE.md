# ARCHITECTURE — Smart Industry IoT Platform

## System Overview

```
Frontend (Next.js) → FastAPI (auth + business logic) → ThingsBoard (entities, telemetry, rule engine)
        ↑                        ↓
        └── WebSocket (live telemetry, proxied via FastAPI)
                              ↓
                        PostgreSQL (hybrid metadata only)
```

ThingsBoard owns: Tenants, Customers (Clients), Assets, Devices, Attributes, Telemetry, Relations, Rule Chains.

PostgreSQL owns: hierarchy definitions, relation-type labels, telemetry catalog, dashboard configs, favorites, onboarding, alarm recipients, granular roles.

## Real-Time Channel

WebSocket is reserved **exclusively for live telemetry** — dashboards subscribe to device/asset telemetry updates through it. The connection is proxied through FastAPI (not opened directly against ThingsBoard) so TB credentials/session stay server-side.

Alarms and system notifications are **not** pushed over WebSocket — they are delivered by email (see `alarm_recipients`), regardless of whether the user has a dashboard open.

## Entity Model Summary

| Layer | Storage | Notes |
| :--- | :--- | :--- |
| Tenant, Client, User | ThingsBoard native | Clients nestable via Relations |
| Location / Area / intermediate | ThingsBoard Asset | `hierarchyLevelId` attribute + "Contains" relation |
| Sensor / Gateway | ThingsBoard Device | |
| Hierarchy labels per Client | `hierarchy_level_definitions` | Custom table |
| Custom entity relations (beyond hierarchy) | ThingsBoard native (Relations) | Any relation type between any two entities; label/icon in `relation_type_definitions` |
| Telemetry units / viz hints | `telemetry_key_catalog` | Custom table |
| Alarm condition | ThingsBoard Rule Chain | Recipients in `alarm_recipients` |
| Granular permissions | `roles` | Points to generic `tb_entity_id`; governs dashboard visibility per user/role, not widget access |

See `docs/schema.dbml` for hybrid table definitions.

## Entity Relations Beyond Hierarchy

The hierarchy tree uses a single reserved relation type ("Contains") for parent/child links. Users also need relationships that aren't parent/child — e.g. a sensor that "Feeds" a tank, a pump that "Powers" a line, a gateway that "Monitors" an area.

- Fully native: any relation type between any two ThingsBoard entities uses TB's own Relation API — no new relation storage.
- Hybrid: per-Client display labels/icons for these custom relation types live in `relation_type_definitions` (same pattern as `hierarchy_level_definitions`), so the frontend shows friendly names instead of raw TB relation-type strings.
- "Contains" stays reserved for the hierarchy tree/breadcrumb view; every other relation type feeds a separate, generic relations view.

## Dashboard Visibility & Permissions

Permissions scope **which dashboards a user/role can see**, not which widgets they can use. `roles.permissions` (jsonb, scoped via generic `tb_entity_id`) determines visibility of entity, solution, and custom dashboards per user/role. The widget catalog (table, chart, map, etc.) is identical for every authenticated user on any dashboard they can already see — there is no per-role widget restriction.

## Data Classifier

Visualization suggestion per telemetry key combines:

1. Native ThingsBoard data type
2. Unit from `telemetry_key_catalog`
3. Name/type heuristics (fallback)

## Reference Telemetry Case

Initial emulated device profile: an industrial pump/station. Used to seed `telemetry_key_catalog` and exercise the Data Classifier end to end before real sensors are connected.

Keys: `alarmCode`, `energy`, `flowRate`, `latitude`, `longitude`, `mode`, `motorSpeed`, `power`, `pressure`, `state`, `temperature`, `vibration`, `volume`.

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
| — | *(none yet)* | — | — |

When adding an ADR: create `docs/adr/NNN-short-title.md` and append a row here.
