---
phase: 10-dashboard-builder
plan: 01
type: Summary
about: "iot-app"
---

# 10-01 Summary — Backend foundation for custom dashboards

**Status:** Applied, `tsc --noEmit` clean, migrated against real local Postgres, AC-1/AC-2/AC-5 verified live via curl against a running backend. AC-3/AC-4 verified by code review only (no working non-sysadmin CUSTOMER_USER test account this session — same broken `operator@customer-a.com` account noted as a deferred blocker since Phase 3/4).

## What was built

- **Prisma schema** (`backend/prisma/schema.prisma`): `Dashboard`, `DashboardCustomerAccess`, `DashboardWidget` models + `DashboardVisibility`/`DashboardCustomerScope` enums, exactly as drafted with the user in CONTEXT.md. Migration `20260805232407_add_dashboards` applied cleanly — no changes to `CustomerHierarchyLevels`/`AssetHierarchyAssignment`/`ImpersonationLog`.
- **Widget-type registry** (`backend/src/dashboards/widget-registry.ts`): `WIDGET_TYPES` const array (`value-tile`, `line-chart`, `attributes-table`, `alarms-list`, `map`) + a Zod schema per type + `validateWidgetConfig(widgetType, config)`. Adding a 6th type is one array entry + one schema — no switch statement anywhere else.
- **`dashboards` module**: `DashboardsService` (list/getById/create/save/delete, `canView` visibility resolution, `resolveCustomerIds` sharing-rule enforcement), `DashboardsController` (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`), `DashboardsModule`, registered in `app.module.ts`.
- **`ws-auth.util.ts`**: exported the existing `isDescendantCustomer` (was private) so `DashboardsService` reuses the same hierarchy-walk logic `CustomerScopeGuard` already uses — no second implementation of the same rule.

## Key decisions made while implementing (not already in CONTEXT.md)

- No new `RolesGuard`/`@Roles()` at the controller level — `ReaderBlockGuard` (already global) blocks every READER mutation, and the `customerScope: 'ALL'` sysadmin-only check is conditional on request body content, so it lives inside `DashboardsService.resolveCustomerIds()` rather than gating the whole endpoint.
- `list()` returns `Dashboard & { customerAccess }` (not full widgets) — widgets are only fetched on `getById()`, since a dashboard list view doesn't need every widget's config.
- `config`/`layout` JSON fields required a `Prisma.InputJsonValue` cast at the two `createMany` call sites — Prisma's generated types don't accept a plain `Record<string, unknown>` or a class-validator DTO instance directly.

## Verification

- `npx prisma migrate dev --name add-dashboards` — applied cleanly.
- `npx tsc --noEmit` — clean in `backend/`.
- Live via curl against `localhost:3001` (backend running, real local Postgres):
  - `GET /dashboards` with no session token → 401 (global `SessionAuthGuard` protects the new routes by default, no `@Public()` needed).
  - `POST /dashboards` with a `line-chart` widget missing `telemetryKey` → 400, message names the exact missing field (AC-2).
  - Created a real dashboard with 2 valid widgets (`value-tile`, `alarms-list`), then `PUT` the same dashboard with those 2 plus a 3rd invalid `map` widget (`entityType: "ASSET"` instead of the literal `"DEVICE"`) → 400, re-fetched the dashboard and confirmed **exactly the original 2 widgets remained**, no partial write (AC-5).
  - Deleted the test dashboard (204) to leave no test data behind.
- AC-3 (cross-customer 403) and AC-4 (non-sysadmin blocked from `customerScope: ALL`) verified by reading `canView`/`resolveCustomerIds` — not exercised live this session, same class of gap as several prior phases' deferred non-sysadmin verification (STATE.md Deferred Issues has a standing note about the broken `operator@customer-a.com` test account).

## Deferred / not done

- AC-3/AC-4 live verification — needs a working non-sysadmin CUSTOMER_USER test account (see above).
- No `POST /dashboards/:id/duplicate` — CONTEXT.md left this as an open question, not decided in this plan.
