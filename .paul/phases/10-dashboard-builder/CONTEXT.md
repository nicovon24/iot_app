# Phase Context

**Phase:** 10 — User-editable dashboards (builder)
**Generated:** 2026-08-05
**Status:** Ready for planning (mechanics only — visual styling follows the Phase 9.1 design system once that phase ships)

## Goals

- Admin/sysadmin users can **create custom dashboards**, **edit their layout** (drag/resize widgets on a grid), and **add/remove/configure widgets** on them. This is the part the user explicitly called "muy importante."
- Dashboards created by an `admin`/`sysadmin` are **shared at the Customer level**: visible to every user under that Customer (and its descendant sub-customers), following the same hierarchy-scoping pattern `CustomerScopeGuard` already applies elsewhere. No per-user granular sharing in this phase.
- The existing fixed **Main Dashboard (Phase 6.5) stays exactly as it is today — non-editable, the system default.** Custom dashboards are additional, reached via a selector/tabs — this is what Phase 6.5's non-functional "future dashboards" seam was anticipating.
- Full persistence of dashboard configs in Postgres: layout (grid position/size per widget) + widget instances + each widget's own config (which entity, which telemetry key, etc.).
- Visual styling of the dashboard builder follows the glassmorphic/purple-accent design system defined in **Phase 9.1 (visual modernization)** — that phase's tokens and glass-card component are what the builder's new UI (widget picker, edit-mode controls, dashboard selector) should be built with once 9.1 ships. Not a blocker to start the builder's mechanics.

## Approach

- **Grid mechanics:** `react-grid-layout`, per the project's own prior V2 scope note (PROJECT.md/ROADMAP.md already named this library for this exact feature).
- **Widgets for v1 — reuse only, no new widget types:** `ValueTileWidget`, `LineChartWidget`, `AttributesTableWidget`, `AlarmsListWidget`, `MapWidget`/`FleetMapWidget` (all exist from Phase 6/6.4). Each becomes "placeable" in a grid item, wrapped to accept a generic per-instance config (entityId, telemetry key, etc.) loaded from persistence instead of hardcoded page props.
- **New Prisma models** (naming indicative, finalize at planning): `Dashboard` (id, customerId, title, createdBy, createdAt) and `DashboardWidget` (id, dashboardId, widgetType, config JSON, layout `{x,y,w,h}`). Follows the project's existing pattern of Postgres-for-metadata-TB-doesn't-model (same family as `CustomerHierarchyLevels`).
- **New backend `dashboards` module:** CRUD scoped through the existing `CustomerScopeGuard` hierarchy logic; create/edit restricted to `ADMIN`/`SYSADMIN` — natural pairing with Phase 9's new READER write-block guard (a `READER` should see shared dashboards but never create/edit one).
- **Frontend:** extend the Phase 6.5 dashboard selector seam into a real tab/dropdown switcher (Main Dashboard + each custom dashboard); an "Edit mode" toggle enabling drag/resize + a widget picker/config panel for adding a widget instance bound to a chosen entity/telemetry key.

## Constraints

- No new widget types in this phase — only the 5 existing ones made grid-placeable. New widget kinds are a future phase.
- Sharing model v1 is Customer-level only (visible to the whole Customer + descendants) — per-specific-user sharing explicitly deferred, not designed here.
- Final visual polish depends on Phase 9.1's design system (glass cards, accent tokens) — this phase can build the functional builder against current styling first and reskin once 9.1 lands, or land after 9.1 directly; sequencing decided at planning time.
- Should land after or alongside Phase 9.2 (roles enforcement) ideally, since dashboard write actions need `READER` correctly blocked — not a hard sequencing blocker, but the two phases are complementary and should not contradict each other on write-permission behavior.
- Note the Dashboard's embedded fleet-map panel is explicitly excluded from Phase 9.1's restyle (maps keep current styling) — the dashboard builder's non-map widgets should follow 9.1's look, but any map widget placed on a custom dashboard keeps the existing Leaflet styling.

## Open Questions

- Exact per-widget-type config schema (e.g. what a `LineChartWidget` instance needs: entityId, telemetry key, interval/agg) — to be nailed down during `/paul:plan`.
- Whether a newly created dashboard starts blank or pre-populated with a default widget set — not decided.
- Whether `READER` should be able to view shared custom dashboards (likely yes, read-only) — depends on Phase 9.2's enforcement design; confirm both phases agree before/during planning.

## Additional Context

- This phase's dashboard-sharing requirement was first raised 2026-08-02 during Phase 6.5 scoping and explicitly deferred to V2 at that time (see STATE.md Decisions) — this discussion is that deferred item being picked up.
- Split from the same conversation as Phase 9.1 (visual modernization) and Phase 9.2 (roles/users) — the user wanted all three discussed, but agreed to plan/execute them as three separate phases.

---

*This file is temporary. It informs planning but is not required.*
*Created by /paul:discuss, consumed by /paul:plan.*
