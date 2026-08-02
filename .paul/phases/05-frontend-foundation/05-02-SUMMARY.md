---
phase: 05-frontend-foundation
plan: 02
subsystem: api
tags: [tanstack-query, websocket, typescript, rest-client]

requires:
  - phase: 05-frontend-foundation (05-01)
    provides: "app/providers.tsx client-boundary wrapper, extended here rather than duplicated"
provides:
  - "frontend/src/types/ — EntityRef/EntityRefLink/EntityType/PageData, TelemetryValue/TelemetryLatest, AttributesPayload, Alarm — mirroring backend contracts, corrected against real live payloads"
  - "frontend/src/lib/api-client.ts — typed REST client with x-session-token auth and typed ApiError"
  - "frontend/src/lib/ws-client.ts — typed WS client for /ws/telemetry and /ws/alarms"
  - "frontend/src/lib/query-client.ts + Providers wiring — TanStack Query, verified caching"
  - "frontend/src/lib/session.ts — minimal in-memory session-token seam for 05-03's login to fill in"
affects: [05-03-login, 06-entity-views]

tech-stack:
  added: ["@tanstack/react-query"]
  patterns:
    - "apiClient is the single fetch chokepoint for all frontend REST calls — mirrors the backend's own ThingsboardClientService.request() single-chokepoint pattern"
    - "WS frame types were corrected to match the REAL wire format (verified live), not the REST DTO shapes — the telemetry WS gateway passes through TB's raw tuple timeseries format, and the alarms WS/REST both pass through TB's raw (unflattened) alarm object, not a backend DTO"

key-files:
  created:
    - frontend/src/types/entity.ts
    - frontend/src/types/telemetry.ts
    - frontend/src/types/attributes.ts
    - frontend/src/types/alarm.ts
    - frontend/src/types/index.ts
    - frontend/src/lib/session.ts
    - frontend/src/lib/api-client.ts
    - frontend/src/lib/query-client.ts
    - frontend/src/lib/ws-client.ts
  modified:
    - frontend/src/app/providers.tsx
    - frontend/package.json

key-decisions:
  - "WsFrame's telemetry data field is typed as WsTimeseriesUpdate (Record<string, [ts, value][]>), not TelemetryLatest — the WS gateway passes through TB's raw tsSubCmds tuple format unchanged, confirmed via a live frame during verification"
  - "Alarm type models the real unflattened ThingsBoard alarm object (nested {id, entityType} refs for id/originator, plus originatorName/details/acknowledged/cleared) — both REST and WS alarm endpoints pass through TB's native shape, not a backend DTO, confirmed via a live GET /alarms call"
  - "session.ts is intentionally a bare module-level variable, no Zustand/persistence — 05-03 owns the real login/session-storage design"

patterns-established:
  - "Verify wire-format types against a REAL live response before trusting a plan's assumed shape — this plan's REST-DTO-shaped assumptions for WS telemetry/alarm frames were both wrong until checked live"

duration: ~1h
started: 2026-08-02T05:00:00Z
completed: 2026-08-02T06:00:00Z
description: "Typed REST + WS API clients, shared entity/telemetry/attribute/alarm types, and TanStack Query wiring — all verified live against the real backend, with two real type-shape corrections found via live WS frame inspection"
type: Summary
about: "iot-app"
---

# Phase 5 Plan 02: API/WS clients + shared types + TanStack Query Summary

**`frontend/` has a working typed data layer — REST client, WS client, TanStack Query, and shared types — verified end-to-end against the real running backend, including finding and fixing two real type-shape mismatches by inspecting actual live WS frames rather than trusting the plan's REST-DTO assumptions.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~1h |
| Tasks | 3 completed |
| Files created/modified | 11 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Typed REST calls succeed against the real backend | Pass | Ran the actual `apiClient.get()` code (via a temporary `tsx` script, deleted after) against the running backend with a real session token from `POST /auth/login` — got real `PageData<EntityRef>` data (4 real Devices) |
| AC-2: Missing/invalid token surfaces as a real 401 | Pass | Same script confirmed `ApiError.status === 401` with the real backend error body, both for no token and a bogus token |
| AC-3: TanStack Query caches a real fetch | Pass | `queryClient.fetchQuery` called twice with an instrumented `queryFn` counting real network calls — second call served from cache (1 network call total, same object reference returned) |
| AC-4: WS client connects and receives real frames | Pass | `createWsClient('telemetry').subscribe()` against a real Device id — socket opened, a real `'telemetry'` frame arrived with live sensor data (energy, flowRate, etc.) |
| AC-5: Types compile clean, telemetry value is string | Pass | `npx tsc --noEmit` passes; `TelemetryValue.value: string` (REST latest-endpoint shape) confirmed correct — but see Deviations for the WS-specific type correction |

## Accomplishments

- A single, reusable REST + WS data layer now exists for Phase 6/7 to build on
- Caught two real wire-format mismatches by testing against live data instead of trusting assumed DTO shapes — both fixed before they could cause silent runtime bugs in Phase 6's telemetry/alarm widgets
- TanStack Query provably caches real backend responses, not just wired in unverified

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `frontend/src/types/entity.ts` | Created | `EntityType`, `EntityRefLink`, `EntityRef`, `PageData<T>` |
| `frontend/src/types/telemetry.ts` | Created | `TelemetryValue` (string value), `TelemetryLatest` — matches the REST `/telemetry/latest` endpoint shape |
| `frontend/src/types/attributes.ts` | Created | `AttributesPayload` |
| `frontend/src/types/alarm.ts` | Created | `Alarm` — corrected to the real unflattened TB alarm shape after live verification |
| `frontend/src/types/index.ts` | Created | Barrel export |
| `frontend/src/lib/session.ts` | Created | Bare in-memory session-token getter/setter |
| `frontend/src/lib/api-client.ts` | Created | Typed `apiClient.get/post`, `ApiError` class, `x-session-token` header wiring |
| `frontend/src/lib/query-client.ts` | Created | Singleton `QueryClient` (5s staleTime) |
| `frontend/src/lib/ws-client.ts` | Created | `createWsClient(channel)`, `WsFrame` discriminated union — `WsTimeseriesUpdate` corrected after live verification |
| `frontend/src/app/providers.tsx` | Modified | Wraps `HeroUIProvider` with `QueryClientProvider` |
| `frontend/package.json` | Modified | Added `@tanstack/react-query` |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `WsTimeseriesUpdate = Record<string, [ts, value][]>` for telemetry WS frames, not `TelemetryLatest` | Live verification showed the WS gateway passes through TB's raw `tsSubCmds` tuple format unchanged — the REST `/telemetry/latest` endpoint's `{value, ts}` object shape is a separate, backend-side transformation that doesn't happen on the WS path | Phase 6's live-telemetry widget must parse `[ts, value][]` tuples, not the REST DTO shape — documented directly in the type's own comment |
| `Alarm` models the real unflattened TB alarm object (nested `{id, entityType}` refs) | Live `GET /alarms` call showed both REST and WS alarm paths pass through TB's native alarm object as-is, not a backend DTO — the backend's own `TbAlarm` interface is itself an incomplete model of what's actually returned | Phase 6's alarms widget must read `alarm.originator.id`, not a flattened `originatorId` |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Both are real type-shape corrections caught by live verification, not scope creep |

**Total impact:** The plan's original type assumptions (mirrored from REST DTOs) were wrong for the two WS payload shapes; both were caught and corrected during this same plan's verification step, before Phase 6 could build on the wrong shape.

### Auto-fixed Issues

**1. [Type mismatch] Telemetry WS frame's `data` field assumed to be `TelemetryLatest`, actually raw TB tuples**
- **Found during:** Task 3 live verification (AC-4) — a real frame showed `"energy":[[1785519160217,"2159.34..."]]`, not `{"energy":{"value":"...","ts":...}}`
- **Fix:** Added `WsTimeseriesUpdate` type, used it instead of `TelemetryLatest` in `WsFrame`
- **Files:** `frontend/src/lib/ws-client.ts`
- **Verification:** Re-ran the live WS test after the fix; `tsc --noEmit` passes

**2. [Type mismatch] `Alarm` type assumed a flattened `{id: string, originatorId: string}` shape, actual data is TB's raw nested alarm object**
- **Found during:** Cross-checking the alarms WS gateway's source (`alarmsService.getForEntity` returns raw `TbAlarm` from ThingsBoard, no flattening) and confirming via a live `GET /alarms` call
- **Fix:** Rewrote `Alarm` in `frontend/src/types/alarm.ts` to nest `id`/`originator` as `{id, entityType}` and add the commonly-present extra fields (`originatorName`, `details`, `acknowledged`, `cleared`) as optional
- **Files:** `frontend/src/types/alarm.ts`
- **Verification:** `tsc --noEmit` passes; shape matches the live `GET /alarms` response exactly

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Backend dev server failed to start (`@prisma/client did not initialize yet`) | An earlier session's `rm -rf node_modules && npm install` (during Tailwind/HeroUI debugging) wiped the generated Prisma client without regenerating it. Ran `npx prisma generate` in `backend/`, then the dev server started clean. |

## Next Phase Readiness

**Ready:** `apiClient`, `createWsClient`, `queryClient`, and all shared types are in place and live-verified for Phase 6's hooks (`useEntities`, `useLiveTelemetry`, `useLiveAlarms`, etc.) to build directly on.
**Concerns:** The backend's own `TbAlarm`/`TelemetryLatest` type declarations don't fully match what ThingsBoard actually returns over WS — this frontend plan worked around it by typing the real wire shape, but the backend types themselves remain technically inaccurate (out of this plan's scope to fix).
**Blockers:** None. 05-03 (login screen) can now call `setSessionToken()` after a real login and everything downstream already works.

---
*Phase: 05-frontend-foundation, Plan: 02*
*Completed: 2026-08-02*
