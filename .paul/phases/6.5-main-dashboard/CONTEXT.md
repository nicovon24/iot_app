# Phase Context

**Phase:** 6.5 — Main Dashboard — fleet summary, counts, map, tables, alarms
**Generated:** 2026-08-02
**Status:** Ready for planning

## Goals

- Replace the `/dashboard` route's `ComingSoon` placeholder (the sidebar's first nav item) with a real summary view of the whole fleet.
- Show at-a-glance counts: total Devices, total Assets, and active alarms count.
- Show the fleet map (all real Devices with location, same clustered/alarm-colored view as Phase 6.4's `/map`).
- Show a Devices table (same data/pattern as `/devices`).
- Show an active-alarms table (a filtered subset of the global alarms view, not the full history).
- Leave a visual seam for future dashboards (V2/V3 custom dashboards), without building any dashboard-switching logic now — just a UI element that visually anticipates more than one dashboard existing later.
- Must ship before Phase 7 (Client creation wizard UI) — explicit user priority.

## Scope Decisions (confirmed with user)

- **Counts:** Devices total, Assets total, active alarms count (ACTIVE_UNACK + ACTIVE_ACK). Customers count explicitly excluded — no simple existing customer-listing UX pattern to reuse yet, and not requested.
- **Sensors table:** Devices only, not Assets — consistent with the fleet map (Phase 6.4 confirmed only Devices have real location telemetry). Reuses `EntityListWidget` exactly as `/devices` does.
- **Alarms table:** Active alarms only (ACTIVE_UNACK/ACTIVE_ACK), not the full alarm history — the dashboard is a "what needs attention now" view; the complete filterable history is already `/alarms`.
- **"Navigate to my other dashboards":** Explicitly deferred — custom/shareable dashboards are a V2/V3 feature (see PROJECT.md "Planned — Version 2" and ROADMAP.md Version 2 table). For this phase: reserve a visual seam only — e.g. a dashboard-name selector/tab showing "Main Dashboard" as the only current entry — no real multi-dashboard switching logic, no persistence, no backend involvement. Purely a UI placeholder so the layout doesn't need rework when V2 adds real dashboards.

## Approach

- **No new backend endpoints** — this phase composes existing hooks/widgets only:
  - `useEntities('DEVICE')` / `useEntities('ASSET')` — for Devices/Assets counts and the Devices table
  - `useGlobalAlarms({})` (unfiltered) — fetch once, filter client-side for `status === 'ACTIVE_UNACK' || 'ACTIVE_ACK'` (same active-alarm check already used in `EntityMapMarker`/`FleetMapWidget` from Phase 6.4) — avoids a second network round-trip just to get an "active" count, since the backend's `status` filter only accepts one value at a time
  - `FleetMapWidget` (Phase 6.4) — reused as-is, no fork
  - `EntityListWidget` (Phase 6) — reused as-is for the Devices table
  - `AlarmsListWidget` (Phase 6) — reused as-is, fed the client-filtered active-alarms array
- **New:** a small presentational `CountTileWidget` (label + value, no telemetry-specific semantics like `ts`/`unit`) — distinct from `ValueTileWidget`, which is telemetry-shaped and inappropriate to repurpose for a static count
- **New:** a minimal dashboard-name UI seam (e.g. a disabled-look selector or single-tab control reading "Main Dashboard") — purely cosmetic/structural, no logic

## Constraints

- Extends Phase 6/6.4 directly — no new widgets duplicating `FleetMapWidget`/`EntityListWidget`/`AlarmsListWidget` logic, only composition
- Follow established conventions: `text-heading/body/muted/faint/danger` tokens, `components/Tooltip.tsx` (not HeroUI's), the widget loading/error/empty pattern already used everywhere
- No backend changes in this phase
- No real multi-dashboard switching, persistence, or sharing logic — that's explicitly V2/V3 scope, tracked separately in ROADMAP.md's Version 2 table

## Open Questions

- Exact visual treatment of the "future dashboards" seam (a disabled `Select` vs. a single non-interactive `Tab` vs. a plain label) — a planning-level UI detail, not a goal-level one.
- Whether `FleetMapWidget` needs a smaller/embedded height variant for the dashboard context (it's currently sized `h-[32rem]` for its own dedicated `/map` page) — likely just reused with the same or a slightly shorter fixed height, decided during planning.

## Additional Context

- This phase was scoped in the same conversation as a request for user-creatable, shareable custom dashboards — that larger ask is explicitly OUT of scope here and tracked in ROADMAP.md's Version 2 table (updated 2026-08-02) and PROJECT.md's "Planned — Version 2" list, with a note that the V1 Main Dashboard is a single fixed dashboard, not a dashboard-builder system.
- Inserted into ROADMAP.md as Phase 6.5 (decimal insertion, same convention as 2.1/2.2/2.3/4.3/6.4), between Phase 6.4 (complete) and Phase 7 (Client wizard UI) — must complete before Phase 7 per explicit user priority.

---

*This file is temporary. It informs planning but is not required.*
*Created by /paul:discuss, consumed by /paul:plan.*
