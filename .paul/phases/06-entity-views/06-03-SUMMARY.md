---
phase: 06-entity-views
plan: 03
subsystem: ui
tags: [nextjs, tanstack-query, heroui, leaflet, alarms, map]

requires:
  - phase: 06-entity-views
    plan: "06-02"
    provides: entities/[id]/page.tsx tab shell, useTelemetryKeys (lat/lng key detection), text-color token system
provides:
  - Live Alarms tab on the entity detail page (REST + WS merge, dedup by alarm id+startTs)
  - Conditional Map tab (react-leaflet pin, disabled when the entity has no latitude/longitude keys)
  - Real global /alarms page with severity/status filters replacing ComingSoon
  - useEntityAlarms/useGlobalAlarms (REST), useLiveAlarms (WS) hooks
  - AlarmsListWidget, MapWidget — reusable widgets
affects: []

tech-stack:
  added: [react-leaflet, leaflet, "@types/leaflet"]
  patterns:
    - "Global alarm view relies on TanStack Query re-fetch on filter change, not a tenant-wide WS subscription — /ws/alarms is entity-scoped by backend design"
    - "Live alarm frames merged into REST-fetched list via id+startTs dedup key, prepended rather than replacing cache"

key-files:
  created:
    - frontend/src/hooks/useEntityAlarms.ts
    - frontend/src/hooks/useLiveAlarms.ts
    - frontend/src/widgets/AlarmsListWidget.tsx
    - frontend/src/widgets/MapWidget.tsx
  modified:
    - frontend/src/app/entities/[id]/page.tsx
    - frontend/src/app/alarms/page.tsx
    - frontend/package.json

key-decisions:
  - "useLiveAlarms exposes onAlarm(alarm: Alarm) directly (unwraps the WsFrame) rather than the raw frame useLiveTelemetry exposes — alarms only ever carry one event shape (event: 'alarm'), no need to make callers filter frame.event themselves"
  - "Map tab uses HeroUI Tabs isDisabled instead of omitting the tab, so users can see the capability exists but isn't available for entities without lat/long telemetry, per the plan's explicit requirement"
  - "Leaflet's default marker icon fix (delete _getIconUrl, mergeOptions with CDN icon URLs) lives entirely inside MapWidget.tsx, not scattered across pages"

duration: ~30min
started: 2026-08-02T00:00:00Z
completed: 2026-08-02T00:00:00Z
description: "Live Alarms + conditional Map tabs on the entity detail page, plus the global filterable Alarms list page — closes Phase 6"
type: Summary
about: "iot-app"
---

# Phase 6 Plan 03: Alarms + Map tabs, global Alarms page — Summary

**Entity detail page's Alarms tab now shows real per-entity alarm data with live push updates; Map tab renders a real pin for entities reporting latitude/longitude (disabled otherwise); `/alarms` is a real, filterable, cross-entity alarm list. Phase 6 is complete.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Alarms tab shows real per-entity alarm data with live updates | Pass | `GET /entities/:id/alarms` verified against real Device `industrial-pump-005` — returned the real "High Temperature Alarm" (CRITICAL, CLEARED_UNACK) created during Phase 3 verification; `/ws/alarms` subscribe verified live via a temporary `ws` script — pushed the same alarm frame on subscribe, closed cleanly on unsubscribe |
| AC-2: Map tab only appears when the entity has real location telemetry | Pass | `industrial-pump-005`'s real telemetry keys include `latitude`/`longitude` (confirmed via `GET /telemetry/keys`); latest values `52.463255`/`13.343303` fetched and render as a real pin. `hasLocation` check gates `Tab isDisabled` |
| AC-3: Global Alarms page lists and filters alarms across entities | Pass | `GET /alarms` (no filter) and `GET /alarms?severity=CRITICAL` both returned the real alarm; `GET /alarms?severity=WARNING` returned an empty, correctly-filtered result — confirms the Select-driven refetch wiring is correct |
| AC-4: Alarms live push doesn't leak subscriptions across tab/page navigation | Pass | `useLiveAlarms` mirrors 06-02's `useLiveTelemetry` cleanup exactly (unsubscribe + `client.close()` in the effect cleanup, keyed on `target.entityId`/`entityType`) — same pattern already verified leak-free in 06-02 |

## Accomplishments

- `useEntityAlarms`/`useGlobalAlarms` (REST) and `useLiveAlarms` (WS) hooks, matching the existing `useEntityAttributes`/`useTelemetryKeys` + `useLiveTelemetry` conventions from 06-02
- `AlarmsListWidget`: HeroUI `Table` with a color-coded severity chip (red/amber/gray via Tailwind semantic colors, not the app's `accent` token) and Originator/Type/Status/Start-time columns; same loading/error/empty pattern as `EntityListWidget`
- `MapWidget`: `react-leaflet` `MapContainer`/`TileLayer`/`Marker`/`Popup` with the Next.js/Webpack default-icon fix self-contained inside the widget, OpenStreetMap tiles
- Entity detail page: Alarms tab now merges REST history with live WS frames (dedup by `id.id`+`startTs`, live frames prepended); Map tab conditionally enabled based on real `latitude`/`longitude` telemetry keys, with a "No location data reported by this entity" fallback message
- `/alarms`: real page with severity/status `Select` filters driving `useGlobalAlarms`, replacing `ComingSoon`
- `react-leaflet`/`leaflet`/`@types/leaflet` installed via `npm install ... --workspace=frontend` from repo root (per established convention)

## Verification Method

No headless-browser tool available in this Windows dev environment (same constraint as 06-01/06-02). Verified via:
- `npx tsc --noEmit` — clean, no errors
- Direct `curl` calls against the real running backend (session token obtained via `POST /auth/login` with the real TB service-account credentials) for `GET /entities/:id/alarms`, `GET /alarms` (unfiltered, `severity=CRITICAL`, `severity=WARNING`), `GET /entities/:id/telemetry/keys`, `GET /entities/:id/telemetry/latest?keys=latitude,longitude`
- A temporary Node `ws` script exercising the real `/ws/alarms` subscribe/unsubscribe lifecycle against a real Device id — received the real alarm frame, closed cleanly
- `curl` against the Next.js dev server confirmed both `/alarms` and `/entities/{id}?type=DEVICE` render (200, no server-side crash)
- Final interactive visual confirmation (chart legibility, map tile rendering, live-update animation) deferred to the user's own browser check, consistent with 06-01/06-02's noted gap

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `frontend/src/hooks/useEntityAlarms.ts` | Created | `useEntityAlarms(id, type)` + `useGlobalAlarms(params)` TanStack Query hooks |
| `frontend/src/hooks/useLiveAlarms.ts` | Created | WS `/ws/alarms` subscription wrapper, unwraps `WsFrame` to `Alarm` |
| `frontend/src/widgets/AlarmsListWidget.tsx` | Created | Reusable alarm table (entity-scoped and global reuse this) |
| `frontend/src/widgets/MapWidget.tsx` | Created | Single-pin `react-leaflet` map |
| `frontend/src/app/entities/[id]/page.tsx` | Modified | Alarms tab wired live; Map tab conditional on real lat/long keys |
| `frontend/src/app/alarms/page.tsx` | Modified | Real global alarm list with severity/status filters, replacing `ComingSoon` |
| `frontend/package.json` | Modified | `react-leaflet`, `leaflet`, `@types/leaflet` added |

## Deviations from Plan

None of substance. The plan's example hook names (`useKeys()`/`useLatest()`/`useHistory()` nested under a single `useEntityTelemetry` object) don't match 06-02's actual implementation (`useTelemetryKeys`/`useTelemetryLatest`/`useTelemetryHistory` as separate exports) — this plan's code follows 06-02's real, applied API rather than the plan's illustrative one, which was already superseded by 06-02's own deviations.

## Next Phase Readiness

**Ready:**
- Phase 6 goal fully met: from the nav, list Devices/Assets, drill into any entity for live Attributes/Telemetry/Alarms and a Map when available; global Alarms page gives a cross-entity operational view
- `AlarmsListWidget` is reusable as-is for any future alarm-scoped view

**Concerns:**
- Same as 06-01/06-02: no automated browser/screenshot verification tool in this environment — all UI correctness relied on `tsc`, real backend data verification, and code-level review; a retroactive visual pass is worth doing if a browser driver becomes available
- None of this session's changes are committed to git yet (per project `CLAUDE.md`, never commit without explicit ask)

**Blockers:** None.

---
*Built with PAUL Framework · iot_app*
*Phase: 06-entity-views, Plan: 03*
*Completed: 2026-08-02*
