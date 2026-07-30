# CURRENT.md

## Now (last updated: 2026-07-30)
- Branch: `main`
- Working on: **Version 1** scaffold — NestJS backend (dynamic entities/attributes/telemetry/alarms proxy over ThingsBoard, Redis-cached) + Next.js frontend (nav, entity detail with live telemetry/alarms/map).

## Version 1 vs Version 2

- **Version 1** (in progress): consume the ThingsBoard API from our own backend (NestJS) and that backend from our own frontend (Next.js), with WebSockets for live telemetry and alarms, attributes, and maps (lat/long).
  - **API shape mirrors ThingsBoard's own model**: entities, attributes, and telemetry keys are looked up dynamically (by entity id/type + key name) instead of hardcoding a fixed set of keys per device type — any telemetry/attribute key the caller asks for is proxied through, so new sensor types don't require backend changes.
  - **Redis** is in scope from the start (not deferred): caches the ThingsBoard JWT and recent telemetry/attribute reads, to cut down repeated calls to ThingsBoard and to the DB.
  - **Postgres/Prisma** is in scope, but narrowly: only `hierarchy_level_definitions` and the Client record itself — the minimum needed for the Client-creation wizard below. No dashboard configs, no catalogs yet.
  - **Client creation wizard**: the one onboarding flow included in V1. Creating a Client also assigns its hierarchy levels. The hierarchy is **static once set** — configurable only at Client-creation time, not editable afterward. This is intentionally the *only* wizard in V1.
  - Designed for extensibility toward V2: entities (Device/Asset) expose stable ids so that later, creating a Device and linking it to a Client + Asset (or any other entity) is a matter of wiring a relation, not a data-model change.
- **Version 2** (backlog, not started): Asset/Device creation + linking wizards, "Contains"/custom relations UI, roles and granular permissions, user-creatable/editable dashboards (`react-grid-layout`), full dashboard config persistence.

## Next (top 3, ordered by priority)
1. Backend V1 — NestJS skeleton + ThingsBoard auth + dynamic entities/attributes/telemetry/alarms + Redis cache layer
2. Backend V1 — Client creation wizard (Client + static hierarchy assignment) backed by Prisma/Postgres
3. Frontend V1 — Next.js skeleton + nav + entity detail (live telemetry/alarms/map) + Client creation wizard UI

## Backlog / near-future (not started)
- V2 onboarding wizards: Asset creation, Device creation + linking (device wizard also creates default structure from `hierarchy_level_definitions` template)
- Roles/permissions rework: role types (manager, operator, ...) with per-dashboard visibility, scoped by creator (`dashboard_configs.created_by`) and target role (`dashboard_configs.visible_to_role_id`)

## Blocked / Known issues
- (none)

## Recently shipped (last ~7 days, older entries move to docs/changelog.md)
- 2026-07-30 — Backend/frontend folder scaffolding created for V1 (NestJS module layout, Next.js App Router layout); README/docs language policy set to English-only, no exceptions
- 2026-07-25 — schema.dbml: `dashboard_configs` gained `visible_to_role_id` (target-role dashboard visibility) and required `created_by`; `roles.permissions` jsonb shape documented; ARCHITECTURE.md updated with onboarding wizards plan and role/permission notes
- 2026-07-25 — schema.dbml reconciled with the telemetry-units ADR: replaced `telemetry_key_catalog` with `telemetry_definitions` + `unit_categories` + `unit_conversions` + `user_unit_preferences`; dropped out-of-scope `onboarding_flows`; added missing `user_role_assignments`; documented telemetry value string-serialization contract in `docs/rules/api.md`
- 2026-07-25 — Husky + lint-staged wired at root (npm workspaces), pre-commit hook active, pre-push (Jest) pending Stage 1 scaffold
- 2026-07-21 — Project docs scaffold (VISION, ARCHITECTURE, rules, agents, schema)
