# CURRENT.md

## Now (last updated: 2026-07-25)
- Branch: `main`
- Working on: Stage 1 backend scaffold (NestJS + ThingsBoard auth) — next up.

## Next (top 3, ordered by priority)
1. Stage 1 backend — NestJS skeleton + ThingsBoard auth
2. Docker Compose — Postgres + ThingsBoard + backend
3. Define first SPEC for hierarchy API (flexible Client levels)

## Backlog / near-future (not started)
- Onboarding wizards: Client creation, Asset creation, Device creation+linking (device wizard also creates default structure from `hierarchy_level_definitions` template)
- Roles/permissions rework: role types (manager, operator, ...) with per-dashboard visibility, now also scoped by creator (`dashboard_configs.created_by`) and target role (`dashboard_configs.visible_to_role_id`)

## Blocked / Known issues
- (none)

## Recently shipped (last ~7 days, older entries move to docs/changelog.md)
- 2026-07-25 — schema.dbml: `dashboard_configs` gained `visible_to_role_id` (target-role dashboard visibility) and required `created_by`; `roles.permissions` jsonb shape documented; ARCHITECTURE.md updated with onboarding wizards plan and role/permission notes
- 2026-07-25 — schema.dbml reconciled with the telemetry-units ADR: replaced `telemetry_key_catalog` with `telemetry_definitions` + `unit_categories` + `unit_conversions` + `user_unit_preferences`; dropped out-of-scope `onboarding_flows`; added missing `user_role_assignments`; documented telemetry value string-serialization contract in `docs/rules/api.md`
- 2026-07-25 — Husky + lint-staged wired at root (npm workspaces), pre-commit hook active, pre-push (Jest) pending Stage 1 scaffold
- 2026-07-21 — Project docs scaffold (VISION, ARCHITECTURE, rules, agents, schema)
