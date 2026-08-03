---
phase: 06-entity-views
plan: 02
subsystem: ui
tags: [nextjs, tanstack-query, heroui, recharts, websocket, telemetry, attributes]

requires:
  - phase: 06-entity-views
    plan: "06-01"
    provides: EntityListWidget row shape, useEntities query-key convention, text-color token system, Tooltip.tsx
provides:
  - Entity detail route (/entities/[id]?type=DEVICE|ASSET) with tabbed Attributes/Telemetry/Alarms(placeholder)/Map(placeholder)
  - useEntityAttributes, useTelemetryKeys/useTelemetryLatest/useTelemetryHistory, useLiveTelemetry hooks
  - AttributesTableWidget, ValueTileWidget, LineChartWidget
  - Devices/Assets list row navigation to entity detail
affects: ["06-03"]

tech-stack:
  added: [recharts]
  patterns:
    - "Telemetry hooks exposed as separate named exports (useTelemetryKeys/useTelemetryLatest/useTelemetryHistory) rather than a single useEntityTelemetry() object with nested methods — simpler call sites, same data source"
    - "useLiveTelemetry exposes the raw WsFrame to the caller (not unwrapped), since telemetry frames carry a keyed tuple map, not a single value — caller filters by event/key itself"
    - "useTelemetryHistory's startTs/endTs computed once via useMemo keyed on the telemetry key, not recomputed on every render — avoids a moving time window that never settles when live WS frames re-render the page"

key-files:
  created:
    - frontend/src/hooks/useEntityAttributes.ts
    - frontend/src/hooks/useEntityTelemetry.ts
    - frontend/src/hooks/useLiveTelemetry.ts
    - frontend/src/widgets/AttributesTableWidget.tsx
    - frontend/src/widgets/ValueTileWidget.tsx
    - frontend/src/widgets/LineChartWidget.tsx
    - frontend/src/app/entities/[id]/page.tsx
    - frontend/src/lib/format.ts
  modified:
    - frontend/src/widgets/EntityListWidget.tsx
    - frontend/src/app/devices/page.tsx
    - frontend/src/app/assets/page.tsx
    - frontend/package.json

key-decisions:
  - "EntityListWidget gained onRowClick as an optional prop (not required) — future Clients list (Phase 7) can reuse it without navigation wiring"
  - "Single-entity lookup (page heading name/type) done via apiClient.get to /devices/:id or /assets/:id directly, not a new dedicated hook, to avoid a one-off abstraction"
  - "formatTelemetryValue (frontend/src/lib/format.ts) rounds numeric telemetry strings for display only — never mutates the underlying string-typed value, keeping the 'telemetry values are always strings' API contract intact"

duration: unknown (applied in a prior session; retroactively unified alongside 06-03)
completed: 2026-08-02T00:00:00Z
description: "Entity detail page with live Attributes table and Telemetry (live tile + historical chart), plus Devices/Assets row navigation"
type: Summary
about: "iot-app"
---

# Phase 6 Plan 02: Entity detail — Attributes/Telemetry tabs Summary

**`/entities/[id]?type=DEVICE|ASSET` renders a real tabbed detail page — Attributes tab shows live scope-grouped data, Telemetry tab shows a selectable key with a live-updating value tile and historical chart; Devices/Assets rows now navigate here.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Clicking a Devices/Assets row navigates to the entity detail page | Pass | `EntityListWidget`'s `onRowClick` wired in both `devices/page.tsx` and `assets/page.tsx` to `router.push('/entities/{id}?type={type}')` |
| AC-2: Attributes tab shows real, scope-grouped attribute data | Pass | Re-verified live during 06-03 unification: `GET /entities/:id/attributes?scope=SERVER_SCOPE` against real Device `industrial-pump-005` returned real keys (`active`, `lastConnectTime`, `customLabel`, etc.) |
| AC-3: Telemetry tab shows a live value and historical chart for a chosen key | Pass | `useTelemetryKeys`/`useTelemetryLatest`/`useTelemetryHistory` + `useLiveTelemetry` wired into `ValueTileWidget`/`LineChartWidget`; real keys (`temperature`, `pressure`, `latitude`, `longitude`, etc.) confirmed live during 06-03 unification |
| AC-4: Alarms and Map tabs render as clearly-labeled placeholders | Pass (superseded) | Rendered via `ComingSoon` in this plan as scoped; replaced with real content in 06-03 |
| AC-5: Loading/error/unmount states are handled cleanly | Pass | `useLiveTelemetry` mirrors the subscribe/unsubscribe + `client.close()` cleanup pattern later reused unchanged by 06-03's `useLiveAlarms` |

## Accomplishments

- First real page consumer of the WS telemetry client, and the first UI use of Phase 2.1's `agg`/`interval` timeseries params
- `AttributesTableWidget`/`ValueTileWidget`/`LineChartWidget` established the widget conventions (loading/error/empty states, `text-*` token usage, `var(--color-accent)` for chart styling) that 06-03's `AlarmsListWidget`/`MapWidget` followed
- `EntityListWidget`'s `onRowClick` extension proved reusable without disrupting 06-01's existing list rendering

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `frontend/src/hooks/useEntityAttributes.ts` | Created | Fetches all 3 attribute scopes in parallel, grouped |
| `frontend/src/hooks/useEntityTelemetry.ts` | Created | `useTelemetryKeys`/`useTelemetryLatest`/`useTelemetryHistory` |
| `frontend/src/hooks/useLiveTelemetry.ts` | Created | WS `/ws/telemetry` subscription wrapper with leak-free cleanup |
| `frontend/src/widgets/AttributesTableWidget.tsx` | Created | Scope-grouped attribute table |
| `frontend/src/widgets/ValueTileWidget.tsx` | Created | Live value tile with change animation |
| `frontend/src/widgets/LineChartWidget.tsx` | Created | Recharts historical line chart |
| `frontend/src/lib/format.ts` | Created | `formatTelemetryValue` — display-only numeric rounding |
| `frontend/src/app/entities/[id]/page.tsx` | Created | Tabbed entity detail page |
| `frontend/src/widgets/EntityListWidget.tsx` | Modified | Added optional `onRowClick` prop |
| `frontend/src/app/devices/page.tsx`, `assets/page.tsx` | Modified | Wired row navigation to entity detail |
| `frontend/package.json` | Modified | `recharts` added |

## Deviations from Plan

The plan's illustrative hook API (`useEntityTelemetry(id, type)` returning `{ useKeys, useLatest, useHistory }`) was implemented instead as three separate named exports (`useTelemetryKeys`, `useTelemetryLatest`, `useTelemetryHistory`) — same data sources and query-key conventions, simpler call sites. 06-03 builds on this actual API, not the plan's illustrative one.

## Next Phase Readiness

**Ready:**
- Tab shell, hook conventions, and widget patterns all proven and directly reused by 06-03 for Alarms/Map
- `useLiveTelemetry`'s cleanup pattern copied verbatim into 06-03's `useLiveAlarms`

**Concerns:**
- Same as 06-01: no automated browser/screenshot tool in this environment — verified via `tsc --noEmit` and direct backend `curl` checks against real data, not interactive browser testing

**Blockers:** None.

---
*Built with PAUL Framework · iot_app*
*Phase: 06-entity-views, Plan: 02*
*Completed: 2026-08-02 (retroactively unified alongside 06-03)*
