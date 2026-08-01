---
phase: 03-live-telemetry-alarms
plan: 02
subsystem: api
tags: [alarms, websocket, thingsboard, nestjs]

requires:
  - phase: 03-live-telemetry-alarms (03-01)
    provides: ws-auth.util.ts (resolveWsSession, isEntityInScope), WsAdapter wiring, TelemetryGateway pattern to mirror
provides:
  - AlarmsService (per-entity + customer-scoped global alarm list)
  - EntityAlarmsController (GET /entities/:id/alarms), GlobalAlarmsController (GET /alarms)
  - AlarmsGateway (/ws/alarms) — polling-based live alarm push
affects: [phase-4-hierarchy, phase-6-frontend-alarms-widget]

tech-stack:
  added: []
  patterns: ["fan-out over scoped entity list instead of an unconfirmed tenant-wide alarm API", "polling+diff fallback for WS push when native subscription protocol isn't confirmed"]

key-files:
  created:
    - backend/src/alarms/alarms.service.ts
    - backend/src/alarms/alarms.controller.ts
    - backend/src/alarms/alarms.gateway.ts
    - backend/src/alarms/alarms.module.ts
  modified:
    - backend/src/app.module.ts
    - backend/src/entities/entities.service.ts

key-decisions:
  - "Global /alarms composes EntitiesService.list + per-entity GET /api/alarm/{entityType}/{entityId} instead of an untested TB tenant-wide alarm API — confirmed correct via ThingsBoard MCP tool description matching this exact endpoint shape"
  - "AlarmsGateway uses ~7s polling+diff instead of a native TB alarm WS subscription (alarmDataCmds) — the plan's own explicit fallback, since that protocol is materially more complex than tsSubCmds and wasn't confirmed working within budget"
  - "Polling logic lives in AlarmsGateway, not ThingsboardWsService, to avoid a circular module dependency (AlarmsModule already depends on ThingsboardModule for other things)"

patterns-established:
  - "Reuse the existing scoping/auth utilities (isEntityInScope, resolveWsSession) verbatim for any new WS gateway — do not fork copies"

duration: ~1 session
description: "Alarms REST (per-entity + customer-scoped global) and a polling-based live alarm WebSocket gateway, completing Phase 3"
type: Summary
about: "iot-app"
---

# Phase 3 Plan 02: Alarms REST + WebSocket Gateway Summary

**Read-only alarm REST endpoints (per-entity and customer-hierarchy-scoped global) plus a live alarm push gateway at `/ws/alarms`, verified against a real ThingsBoard alarm created and cleared during this session.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Per-entity alarms readable and scoped | Pass | `GET /entities/{id}/alarms?type=DEVICE` returned the real test alarm (200); scoping is free via the existing `CustomerScopeGuard` (`:id`+`type` route) |
| AC-2: Global list is customer-hierarchy scoped | Partial pass | Verified the TENANT_ADMIN unscoped path (saw the alarm across the tenant). The CUSTOMER_USER-scoped exclusion path relies on `EntitiesService.list`'s already-proven scoping (Phase 2.2/03-01) rather than a fresh live test in this session — the test account (`operator@customer-a.com`) no longer authenticates (password likely rotated outside this session, see Issues) |
| AC-3: Severity/status filtering | Pass | `GET /alarms?severity=CRITICAL` returned the 1 real alarm; `GET /alarms?severity=MINOR` returned 0 |
| AC-4: Live alarm push over WebSocket | Partial pass | In-scope subscribe verified end-to-end: created a real ThingsBoard alarm via the ThingsBoard MCP tool, subscribed over `/ws/alarms`, received the `{event:"alarm",...}` frame with real alarm data within the first poll. Out-of-scope rejection not re-verified live this session (same reason as AC-2) — reuses the identical `isEntityInScope` function already verified with a real out-of-scope CUSTOMER_USER in 03-01 |

## Accomplishments

- Confirmed the real ThingsBoard per-entity alarm endpoint shape (`GET /api/alarm/{entityType}/{entityId}`) against the ThingsBoard MCP tool's own `getAlarms` description before committing to it — no guessing
- Created, observed via REST, pushed via WS, and cleared a real ThingsBoard alarm end-to-end during verification (not mocked)
- Phase 3 now complete: both 03-01 (telemetry) and 03-02 (alarms) deliver PROJECT.md's live-data core value

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `backend/src/alarms/alarms.service.ts` | Created | `getForEntity` (real TB per-entity alarm call), `getAllScoped` (fan-out + hierarchy scoping) |
| `backend/src/alarms/alarms.controller.ts` | Created | `EntityAlarmsController` (`entities/:id/alarms`), `GlobalAlarmsController` (`alarms`) |
| `backend/src/alarms/alarms.gateway.ts` | Created | `/ws/alarms` gateway — same auth/scope/validation pattern as `TelemetryGateway`, polling+diff push |
| `backend/src/alarms/alarms.module.ts` | Created | Wires `ThingsboardModule`, `AuthModule`, `EntitiesModule`; registers controllers, service, gateway |
| `backend/src/app.module.ts` | Modified | Registers `AlarmsModule` |
| `backend/src/entities/entities.service.ts` | Modified | Exported `buildPageParams`/`applyClientSidePagination` (previously private) for reuse by `AlarmsService` |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Global alarm list composes existing entity-scoping + per-entity alarm calls, not a tenant-wide TB alarm search API | That API's contract isn't confirmed against this project's real TB instance and varies by version; the per-entity endpoint is confirmed stable (matches ThingsBoard MCP tool description exactly) | N+1 fan-out cost accepted as a known V1 tradeoff (documented in plan boundaries), not solved here |
| WS alarm push uses polling+diff (~7s) instead of native `alarmDataCmds` | That protocol is materially more complex than telemetry's `tsSubCmds` and wasn't confirmed working within this plan's effort budget — the plan itself pre-authorized this fallback | Real-world alarm push latency is up to ~7s, worse than telemetry's near-instant relay; acceptable for V1, revisit if a frontend need demands lower latency |
| Polling logic placed in `AlarmsGateway`, not `ThingsboardWsService` | Avoids a circular module dependency between `ThingsboardModule` and `AlarmsModule` | Slight deviation from the plan's literal wording ("extend ThingsboardWsService") — functionally equivalent, cleaner module graph |
| `alarms.types.ts` not created | `TbAlarm`/`TbAlarmSeverity`/`TbAlarmStatus` already existed in `thingsboard.types.ts` from earlier phases | One fewer file than planned, no functional difference |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 0 | — |
| Deferred | 2 | Logged below |

**Total impact:** Minor — both deferrals are re-verification gaps caused by an external test account becoming unusable mid-session, not code defects; the underlying logic being skipped was already proven correct in 03-01 against the same account.

### Deferred Items

- **AC-2/AC-4 out-of-scope path not re-verified live this session**: `operator@customer-a.com` no longer authenticates against real ThingsBoard (401 "Invalid credentials") — likely the test password noted in STATE.md's Blockers/Concerns was rotated or the account was otherwise touched outside this session. The scoping logic itself (`isEntityInScope`) is unchanged and was verified with this exact account in 03-01. Revisit: create a fresh test CUSTOMER_USER (or reset this one's password) next session and re-run the out-of-scope WS/REST checks for alarms specifically.
- **Native ThingsBoard alarm WS subscription (`alarmDataCmds`) not implemented** — polling+diib fallback used instead, per the plan's own pre-authorized fallback. Revisit if Phase 6's alarms widget needs sub-second alarm latency.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Test CUSTOMER_USER account (`operator@customer-a.com`) returned 401 on login, blocking live out-of-scope re-verification | Relied on 03-01's already-verified test of the same scoping function with the same account instead of re-testing; documented as a deferred item rather than skipped silently |
| No real alarms existed on the TB instance to verify against initially | Used the ThingsBoard MCP `saveAlarm` tool to create a real test alarm on `industrial-pump-005`, verified through REST + WS, then cleared it with `clearAlarm` — left no test data behind |

## Next Phase Readiness

**Ready:**
- Phase 3 complete — both plans applied, runtime-verified against real ThingsBoard Cloud, and documented
- Alarms REST/WS follow the exact same auth/scoping conventions as telemetry — Phase 6's frontend alarms widget has a consistent contract to build against for both live data types

**Concerns:**
- Alarm push latency (~7s polling) may feel sluggish compared to telemetry's near-instant relay — worth a native-subscription revisit if UX feedback in Phase 6 flags it
- The out-of-scope re-verification gap (see Deferred Items) should be closed early in the next session, before trusting alarm scoping in front of a real user

**Blockers:** None

---
*Phase: 03-live-telemetry-alarms, Plan: 02*
*Completed: 2026-07-31*
