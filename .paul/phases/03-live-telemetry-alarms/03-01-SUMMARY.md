---
phase: 03-live-telemetry-alarms
plan: 01
subsystem: api
tags: [websocket, telemetry, thingsboard, nestjs, ws-adapter]

requires:
  - phase: 2.2-tb-native-permissions
    provides: AppSession model, CustomerScopeGuard scoping decision, EntitiesService.getOwningCustomerId
provides:
  - TelemetryGateway (client-facing WS subscribe/unsubscribe protocol)
  - ThingsboardWsService (multiplexed upstream TB telemetry WS client with reconnect/backoff)
  - Shared REST/WS scoping util (ws-auth.util.ts)
affects: [03-02-alarms, phase-5-frontend-ws-client]

tech-stack:
  added: []
  patterns: ["@nestjs/platform-ws WsAdapter over Fastify", "ref-counted upstream WS subscription multiplexing"]

key-files:
  created:
    - backend/src/common/guards/ws-auth.util.ts
    - backend/src/thingsboard/thingsboard-ws.service.ts
    - backend/src/telemetry/telemetry.gateway.ts
  modified:
    - backend/src/main.ts
    - backend/src/common/guards/customer-scope.guard.ts
    - backend/src/thingsboard/thingsboard.module.ts
    - backend/src/telemetry/telemetry.module.ts

key-decisions:
  - "WsAdapter (@nestjs/platform-ws) chosen over @fastify/websocket plugin, per user decision, to keep standard Nest gateway conventions"
  - "Scoping logic extracted from CustomerScopeGuard into isEntityInScope (ws-auth.util.ts), used by both REST guard and WS gateway"
  - "ThingsboardWsService reuses the shared service-account credential (ThingsboardClientService.getToken()), consistent with the existing REST model — no per-user TB token wiring in this plan"

patterns-established:
  - "One multiplexed upstream WS connection per backend instance, ref-counted per entity subscription — not one upstream connection per client"

duration: ~1 session
description: "Telemetry WebSocket gateway: clients subscribe by entity id over /ws/telemetry, backend multiplexes ThingsBoard's own WS telemetry subscription upstream, scoped by the same customer-hierarchy rule as REST"
type: Summary
about: "iot-app"
---

# Phase 3 Plan 01: Telemetry WebSocket Gateway Summary

**Clients can subscribe to live telemetry per entity over `/ws/telemetry`, authenticated and customer-scoped identically to REST, without ThingsBoard credentials ever reaching the browser.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Connection requires a valid session | Pass | No/invalid token → immediate close, code 1008, reason "Missing or invalid session token" |
| AC-2: Out-of-scope subscribe rejected | Pass | Real CUSTOMER_USER session (`operator@customer-a.com`) subscribing to a device outside its customer hierarchy got `{event:"error", message:"forbidden"}`, no telemetry frames |
| AC-3: In-scope subscribe streams live updates | Pass | Verified against a real ThingsBoard Cloud emulated device (`industrial-pump-005`); both TENANT_ADMIN and scoped CUSTOMER_USER sessions received live `{event:"telemetry",...}` frames |
| AC-4: Unsubscribe/disconnect cleanup | Pass | Explicit unsubscribe: 0 messages received after sending `unsubscribe` (verified over a 40s window). Disconnect cleanup verified indirectly — after two clients disconnected without unsubscribing, a fresh client's subscribe to the same entity created a brand-new upstream subscription rather than reusing a stale one, proving `handleDisconnect` decremented the ref count correctly |
| AC-5: Upstream reconnects on drop | Not runtime-verified | Reconnect/backoff logic implemented and code-reviewed (exponential backoff, resubscribes all active entities on reconnect — mirrors `RedisService`'s retry pattern), but a real ThingsBoard Cloud WS drop could not be forced from this environment to observe the reconnect in action. Flagged as a real verification gap, not skipped silently — see Deviations |

## Accomplishments

- Single multiplexed upstream WS connection to ThingsBoard confirmed via runtime test: 3 separate client sockets subscribing to the same entity across two test runs produced exactly **one** "Connected to ThingsBoard telemetry WS" log line total, no duplicate `tsSubCmds` connections
- Customer-hierarchy scoping decision extracted into a single shared function (`isEntityInScope`) used by both `CustomerScopeGuard` (REST) and `TelemetryGateway` (WS) — confirmed no REST regression: in-scope `:id` request still 200, out-of-scope still 403, TENANT_ADMIN unscoped list still 200
- Verified end-to-end against real ThingsBoard Cloud (not mocked): real device telemetry (`industrial-pump-005`), real scoped test user (`operator@customer-a.com`, customer `Test-Child` scoped to `industrial-pump-002`)

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `backend/src/common/guards/ws-auth.util.ts` | Created | `resolveWsSession` (delegates to `AuthService.getSession`) + `isEntityInScope` (extracted scoping decision), shared by REST guard and WS gateway |
| `backend/src/common/guards/customer-scope.guard.ts` | Modified | Refactored to call `isEntityInScope` instead of duplicating the descendant-walk logic |
| `backend/src/thingsboard/thingsboard-ws.service.ts` | Created | Multiplexed upstream TB telemetry WS client: ref-counted subscriptions, exponential-backoff reconnect, resubscribes all active entities on reconnect |
| `backend/src/thingsboard/thingsboard.module.ts` | Modified | Registers/exports `ThingsboardWsService` alongside the existing REST/Redis providers |
| `backend/src/telemetry/telemetry.gateway.ts` | Created | Client-facing `/ws/telemetry` gateway: connection-time auth, `subscribe`/`unsubscribe` message handlers, per-client cleanup on disconnect |
| `backend/src/telemetry/telemetry.module.ts` | Modified | Imports `AuthModule`/`EntitiesModule`, registers `TelemetryGateway` |
| `backend/src/main.ts` | Modified | `app.useWebSocketAdapter(new WsAdapter(app))` so `@WebSocketGateway` works over the existing Fastify HTTP server via `ws` |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `@nestjs/platform-ws` WsAdapter over `@fastify/websocket` | User's explicit choice — keeps standard Nest gateway/DI conventions rather than hand-rolling a Fastify route | Any future WS gateway (e.g. alarms in 03-02) follows the same pattern |
| Scoping logic extracted to a shared util rather than duplicated | REST and WS must never enforce two different hierarchy rules that could drift apart | `CustomerScopeGuard` is now a thin wrapper calling `isEntityInScope`; the original guard's distinct "no resolvable customer scope" vs "outside hierarchy" error messages were collapsed into one path (both now yield a generic forbidden/403) — a minor message-specificity regression, not a security regression (see Deviations) |
| WS upstream uses the shared service-account TB credential, same as REST | Consistent with the existing V1 model (STATE.md: entity-scoped calls share the service-account credential); no new credential-handling surface introduced | Same known deferred item applies here too — no TB-native per-user WS isolation yet |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Minor, improves correctness |
| Scope additions | 0 | None |
| Deferred | 1 | AC-5 not runtime-verified (environment limitation) |

**Total impact:** Minor — one small behavior change in REST error-message specificity (not a security regression), one honestly-flagged verification gap for the reconnect path.

### Auto-fixed Issues

**1. Gateway message-handler parameter binding**
- **Found during:** Task 3 (writing `TelemetryGateway`)
- **Issue:** Initial draft used positional `(client, data)` parameters on `@SubscribeMessage` handlers, which is adapter-dependent and not guaranteed stable across Nest WS adapters
- **Fix:** Switched to explicit `@ConnectedSocket()`/`@MessageBody()` decorators, the adapter-agnostic pattern documented by NestJS
- **Files:** `backend/src/telemetry/telemetry.gateway.ts`
- **Verification:** `tsc --noEmit` and `nest build` both pass; runtime subscribe/unsubscribe tests confirm correct client/payload resolution

### Deferred Items

- **AC-5 (upstream reconnect) not runtime-verified**: could not force a real ThingsBoard Cloud WS drop from this environment. Revisit with a controlled test (e.g. temporarily blocking the WS port, or a local ThingsBoard Docker instance that can be killed/restarted) before relying on this in production. Logic is implemented and code-reviewed, following the same exponential-backoff pattern already proven in `RedisService`.
- **`CustomerScopeGuard`'s distinct error message for "entity has no resolvable customer scope" was lost** in the refactor to shared `isEntityInScope` (now both that case and "outside hierarchy" return a generic false → 403 "Entity is outside your customer hierarchy"). Functionally equivalent (still 403), but less specific for debugging. Low priority — revisit if this distinction turns out to matter for frontend error handling in Phase 6.

## Post-Apply Code Review

A manual code review (per user request, `/code-review` on the changed files — not PAUL-native, since PAUL has no post-APPLY code-review command) found 2 real issues in the just-applied code, both fixed and re-verified before closing the loop:

| Finding | Severity | Fix |
|---------|----------|-----|
| `TelemetryGateway.handleSubscribe` race: two rapid subscribe messages for the same entity from one client double-increment `ThingsboardWsService`'s ref count, but only the last `unsubscribe` closure is stored — the extra ref is never released, permanently leaking an upstream TB subscription | High (unbounded resource growth over app lifetime) | Reserve the `clientSubs` map key synchronously (no-op placeholder) before the first `await`, so a concurrent duplicate subscribe for the same key is rejected instead of also calling `tbWs.subscribe` |
| WS `subscribe`/`unsubscribe` payloads (`entityId`, `entityType`) were never validated, unlike REST's `ParseTbIdPipe` — a malformed `entityId` or unhandled TB error threw an uncaught exception inside the async handler with no response sent to the client | Medium (reliability, not an auth bypass — scoping still enforced for well-formed real IDs) | Added `isValidSubscribePayload()` reusing the same TB-UUID regex as `ParseTbIdPipe`, plus a try/catch around the whole scope-check/subscribe flow that sends a structured `{event:'error'}` frame instead of failing silently |

Both fixes verified at runtime against real ThingsBoard Cloud: a malformed `entityId` now gets `{"event":"error","message":"invalid entityId or entityType"}` instead of an unhandled rejection; a valid subscribe still streams live telemetry normally after the fix.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| A stale `node dist/main` process from an earlier session was already bound to port 3001, causing a confusing `EADDRINUSE` on the new dev-server start | Identified via `netstat`/`Get-CimInstance` command-line inspection, killed the stale process, restarted cleanly with a fresh log for verification |
| First multiplex test showed only one of two clients receiving a telemetry frame within the test window | Not a bug — ThingsBoard's emulated device pushes updates on its own interval; a longer-window retest with a fresh subscriber confirmed shared delivery works correctly once within that window |

## Next Phase Readiness

**Ready:**
- 03-02 (Alarms REST + WS gateway) can follow the exact same pattern: `isEntityInScope` for scoping, a second `ThingsboardWsService`-style upstream client (or extend the existing one) for alarm push subscriptions
- Frontend (Phase 5+) has a working WS contract to build a client against: `?token=` query auth, `{event, data}` message shape

**Concerns:**
- AC-5 reconnect behavior is implemented but not proven against a real dropped connection — worth a dedicated verification pass before Phase 6 depends on live telemetry being resilient
- No horizontal scaling: in-memory ref-counting means this only works for a single backend instance (explicitly out of scope for V1 per PLAN.md boundaries)

**Blockers:** None

---
*Phase: 03-live-telemetry-alarms, Plan: 01*
*Completed: 2026-07-31*
