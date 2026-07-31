---
phase: 02-dynamic-entities-api
plan: 01
type: Summary
about: "iot-app"
---

# Summary: Dynamic entities, attributes & telemetry API

## What shipped

- `backend/src/entities/` — `EntityRef` type unifying Device/Asset, `EntitiesService.list(type)`/`getById(id, type)` calling TB's `/api/tenant/devices` and `/api/tenant/assets` paged endpoints, `GET /entities?type=`, `GET /entities/:id?type=` (AC-1).
- `backend/src/devices/`, `backend/src/assets/` — thin `GET /devices`, `/devices/:id`, `/assets`, `/assets/:id` on top of `EntitiesService`.
- `backend/src/attributes/` — `AttributesService.getAttributes(entityId, entityType, scope)` proxies TB's `/api/plugins/telemetry/{type}/{id}/values/attributes/{scope}` verbatim (no key whitelist), Redis-cached 5s. `GET /entities/:id/attributes?type=&scope=` (AC-2).
- `backend/src/telemetry/` — `TelemetryService`: `getKeys`, `getLatest` (Redis-cached 3s, keys optional = "all"), `getTimeseries` (forwards `agg` to ThingsBoard, never computes aggregates locally). All values serialized via `String(value)` before leaving the service (AC-3). Endpoints: `GET /entities/:id/telemetry/keys|latest|timeseries`.
- `backend/src/thingsboard/thingsboard.types.ts` — added `TbPageData<T>` for TB's paged list responses.
- `backend/src/common/dto/telemetry-value.dto.ts` — documents the string-serialization contract for Swagger; `decimals` field left `undefined` with an explicit note that no `telemetry_definitions` catalog exists yet in V1 REST (that's an ARCHITECTURE.md concept not yet built as an endpoint).
- Wired all 5 new modules into `app.module.ts`.

## Verified this session

- `npx nest build` — clean, no type errors.
- Booted the compiled app with fake TB/Redis env vars: all routes map correctly (`/entities`, `/devices`, `/assets`, `/entities/:id/attributes`, `/entities/:id/telemetry/{keys,latest,timeseries}`), Nest starts successfully, `GET /api/docs` returns 200. Confirms wiring is correct independent of live TB/Redis.
- Redis connection failures (expected, no Redis running this session) surface as `ioredis` warnings, not crashes — the app stays up.
- **Full runtime verification against real infra (2026-07-30, follow-up session):** with real ThingsBoard Cloud credentials + local Redis (`docker run redis:7`):
  - `GET /entities?type=DEVICE` → real fleet (`industrial-pump-002..006`) (AC-1).
  - `GET /entities/:id/attributes?type=DEVICE&scope=SERVER_SCOPE` → returned exactly TB's own keys (`lastActivityTime`, `active`, `lastConnectTime`, ...) with zero hardcoded filtering (AC-2).
  - `GET /entities/:id/telemetry/keys` → `["temperature","pressure","state","power","latitude","longitude","mode","energy","volume","vibration","flowRate","motorSpeed","alarmCode"]` — confirms dynamic key discovery works for the reference pump/station profile from ARCHITECTURE.md.
  - `GET /entities/:id/telemetry/latest` → every value is a JSON string (e.g. `"51.60635621529013"`, `"NONE"`), never a number (AC-3).
  - Cache hit measured directly: 1st call to `telemetry/latest` took 451ms (real TB round-trip), 2nd call (within the 3s TTL) took 36ms served from Redis — same payload (AC-4).

## Decisions made

- No `telemetry_definitions`/unit-conversion catalog in this plan — out of scope per ARCHITECTURE.md's data classifier being a separate concern; `decimals` stays `undefined` rather than a fake placeholder value.
- `devices`/`assets` controllers stay thin wrappers over `EntitiesService` rather than duplicating TB-calling logic — keeps `ThingsboardClientService.request()` as the single chokepoint (Phase 1 boundary honored).
- Aggregation (`agg` query param) is forwarded to ThingsBoard's own timeseries API, never computed in the backend — matches `docs/rules/api.md`.

## Deferred / follow-ups for later phases

- Phase 3 (WS gateways) will reuse `EntitiesService`/`TelemetryService` types but needs its own subscription-based connection to TB, not the REST `request()` helper.
- No automated tests yet for cache-hit vs cache-miss paths — add when Jest is wired up (same deferral as Phase 1).
