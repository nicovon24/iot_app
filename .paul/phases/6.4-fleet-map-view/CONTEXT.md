# Phase Context

**Phase:** 6.4 — Fleet map view — custom markers, clustering, nav entry
**Generated:** 2026-08-02
**Status:** Ready for planning

## Goals

All three weigh equally — none is a "nice to have" relative to the others:

- **Goal 1: Modernize the existing per-entity Map tab pin.** The current default Leaflet blue marker (from Phase 6's `MapWidget.tsx`) gets replaced with a custom marker whose color reflects the entity's alarm state — green if no active alarm, red/amber if it has one.
- **Goal 2: New "Maps" nav entry — fleet-wide map.** A new page reachable from the sidebar nav shows every real Device that reports `latitude`/`longitude` telemetry, all on one map (not per-entity anymore).
- **Goal 3: Marker clustering.** When multiple pins are close together at the current zoom level, group them into a numbered circle (à la ThingsBoard/Leaflet.markercluster), expanding on zoom/click.

## Scope Decisions (confirmed with user)

- **Devices only for the fleet map, not Assets** — today only Devices have confirmed real lat/long telemetry (the reference pump profile); Assets can be added later if needed, not blocking this phase.
- **Pin color reflects alarm state**, not a fixed/neutral color — green (no active alarm) vs red/amber (has an active alarm). Requires cross-referencing each Device's alarm status, not just its location.
- **Popup on pin click** (both the fleet map and the existing per-entity Map tab, for visual consistency) shows:
  - Entity name
  - **All** telemetry keys and their latest values (not just 1-2 "highlight" keys) — user explicitly wants the full list, with a scroll container inside the popup if the list is long (the reference pump profile has 13 keys)
  - Last report time
  - A "Details" button that navigates to `/entities/[id]?type=DEVICE`
- Click does NOT navigate directly — it opens the popup first; the user then clicks "Details" to navigate. Avoids accidental navigation while panning/zooming near a pin.

## Approach

- **No new backend endpoints planned for this phase.** Reuse existing hooks client-side:
  - `useEntities('DEVICE')` — device list
  - `useTelemetryKeys` / `useTelemetryLatest` — per-device lat/long presence + all-keys latest values for the popup
  - `useEntityAlarms` (or equivalent) — per-device alarm status for pin coloring
  - This is an N+1 client-side fetch pattern (one telemetry+alarms round-trip per device). Acceptable at current scale (4 real Devices). Flagged as tech debt if the fleet grows — a batched backend endpoint (e.g. `GET /entities/locations`) would be the correct fix at that point, not built now.
- **New library:** `react-leaflet-cluster` (wraps `Leaflet.markercluster`, the same clustering approach ThingsBoard itself uses) for Goal 3.
- **Shared marker component:** build the custom colored marker + popup as one reusable piece, used by BOTH the fleet map (new) and the existing per-entity `MapWidget.tsx` (Phase 6) — so the single-pin Map tab and the new fleet map look and behave consistently, not two divergent marker implementations.
- **New nav item** in `frontend/src/lib/nav-items.ts` (data-driven array, per Phase 5's convention) pointing to a new route, e.g. `/map`.

## Constraints

- Extends Phase 6 work directly (`MapWidget.tsx`, `react-leaflet`, telemetry/alarm hooks) — do not fork into a parallel map implementation.
- Follow established Phase 5/6 conventions: `text-heading/body/muted/faint/danger` tokens, `components/Tooltip.tsx` (not HeroUI's), widget loading/error/empty pattern from `EntityListWidget`/`AttributesTableWidget`/`AlarmsListWidget`.
- No backend changes in this phase (client-side composition only), per the approach above.

## Open Questions

- Exact route path for the new nav item — `/map` is the working assumption, confirm during planning.
- Whether the fleet map's alarm-status check should reuse `useEntityAlarms` per-device (N+1) as-is, or whether a lighter existence-check (e.g. "does this device have any ACTIVE_UNACK/ACTIVE_ACK alarm") is worth a small dedicated hook — a planning-level detail, not a goal-level one.

## Additional Context

- This phase was scoped after the user used Phase 6's per-entity Map tab and asked for a nicer pin, a fleet-wide map, and clustering "como hace ThingsBoard" in the same conversation.
- Inserted into ROADMAP.md as Phase 6.4 (decimal insertion, same convention as 2.1/2.2/2.3/4.3), between Phase 6 (complete) and Phase 7 (Client wizard UI, not started) — independent of Phase 7, no shared dependency either direction.

---

*This file is temporary. It informs planning but is not required.*
*Created by /paul:discuss, consumed by /paul:plan.*
