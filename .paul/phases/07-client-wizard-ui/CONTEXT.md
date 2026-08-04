---
phase: 07-client-wizard-ui
type: Context
about: "iot-app"
---

# Phase 7 Discussion: Client creation wizard UI

## Goals

- An admin (sysadmin) can create a Client (ThingsBoard Customer) with its ordered hierarchy (e.g. Site → Area → Asset → Sensor) from the frontend, via a multi-step wizard, matching the backend built in Phase 4.
- Once a Client exists, the admin can also create Assets against that Client's hierarchy (choosing a hierarchy level + parent), reusing the backend built in Phase 4.3 (`POST /assets`, real TB "Contains" relation).
- Devices remain explicitly out of scope — the backend has no Device creation/linking endpoint (`POST /devices` was removed in Phase 4.3), and building one is a separate, larger V2 item. Not touched this phase.

## Scope decisions (confirmed with user)

- **Two separate flows, not one combined wizard:**
  1. Client-creation wizard (basic info → hierarchy levels → review → submit) — creates the Customer + hierarchy atomically via `POST /customers`.
  2. A separate "Add Asset" flow/screen for an *existing* Client — picks hierarchy level + parent (Customer or existing Asset), submits via `POST /assets`.
- Devices: no UI, no backend changes. Stays read-only (`GET /devices`, `GET /devices/:id`) per Phase 4.3's explicit decision.
- The existing "Clients" nav item (`frontend/src/lib/nav-items.ts`, currently `comingSoon: true`) becomes the real entry point — a Clients list page + "Create Client" wizard.

## Backend contracts already available (no backend changes needed)

- `POST /customers` (sysadmin-only via `RolesGuard`/`@Roles('SYSADMIN')`): `{ name, parentCustomerId?, hierarchyLevels: [{levelIndex, name}] }`, atomic TB Customer + Postgres hierarchy, compensating rollback on Postgres failure. Hierarchy is immutable after creation — UI must make this explicit before submit.
- `GET /customers` (hierarchy-scoped list), `GET /customers/:id`, `GET /customers/:id/hierarchy` (ordered by `levelIndex`).
- `POST /assets`: `{ name, type, label?, customerId, levelIndex, parentId }` — `parentId` is the Customer id (level 0) or an existing Asset id; validates level/parent consistency against `CustomerHierarchyLevels` + `AssetHierarchyAssignment`, creates a real TB "Contains" relation, rolls back on failure.
- `GET /assets` already exists and is used by `/assets` page (Phase 6/6.5) — reused as-is for the "pick a parent Asset" step.

## Approach notes

- `react-hook-form` + `zod` are NOT currently installed in `frontend/package.json` (despite ROADMAP.md claiming they were "already in stack") — must be added this phase.
- Client-side validation should mirror the backend: hierarchy required/non-empty, immutable-after-submit messaging, sysadmin-only access (the wizard route/button should not be reachable/usable by non-sysadmin sessions — check `session.authority` client-side for UX, real enforcement stays server-side via `RolesGuard`).
- Reuse established conventions: `text-heading/body/muted/faint/danger` tokens, `components/Tooltip.tsx`, the widget loading/error/empty pattern (`EntityListWidget`/`AlarmsListWidget`/`CountTileWidget`), `EntityListWidget` for the Clients list (already supports arbitrary `EntityRef` rows, just needs a `customers` source + no `onRowClick` or a details view).
- Default suggested hierarchy: Site → Area → Asset → Sensor (pre-filled, editable/reorderable, free-text per level per Phase 4's design — not a fixed enum).

## Open questions for planning

- Exact wizard step boundaries (info → hierarchy → review, or fewer/more steps) — left to plan-phase to detail into tasks.
- Where the "Add Asset" entry point lives (Client detail view vs. a button on `/assets`) — left to plan-phase.

---
*Context saved for handoff to /paul:plan*
