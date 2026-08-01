---
description: "iot_app — improvement ideas and backlog items not yet scheduled into a phase"
type: Improvements
about: "iot-app"
---

# Improvements Backlog

Ideas and review notes captured outside the active phase loop. Referenced from `ROADMAP.md`'s Version 2 table and `STATE.md`'s Deferred Issues — this file is where they're described in more depth. Nothing here is scheduled or implemented until it's picked up into a real `/paul:plan`.

## EntityRef Reference Fields — Enrich Owner/Tenant/Customer/Profile Refs

Captured 2026-07-31, alongside the Alarms API review.

### Current state

`EntityRef` (`entities.types.ts`) and the raw `TbDevice`/`TbAsset`/`TbCustomer` shapes (`thingsboard.types.ts`) expose reference fields as bare id strings only:

```json
{
  "tenantId": "f0e780a0-851f-11f1-bb5b-f59caa77e86d",
  "customerId": "13814000-1dd2-11b2-8080-808080808080",
  "assetProfileId": "f0f8e5c0-851f-11f1-bb5b-f59caa77e86d",
  "ownerId": "..."
}
```

A frontend consuming this has no name/label to show without a second round-trip per reference (e.g. `GET /customers/:id` just to display the customer's name next to a device).

### Requested improvement

Turn these bare-id fields into small enriched reference objects, each shaped like:

```json
{ "id": "13814000-1dd2-11b2-8080-808080808080", "name": "Test-Child", "label": null }
```

Applies to: `tenantId`, `customerId`, `assetProfileId`, `ownerId` (and any other bare TB entity-id ref surfaced on `EntityRef`/`TbDevice`/`TbAsset`/`TbCustomer` going forward). The user's phrasing suggested an array shape — worth clarifying at planning time whether this means:
- **(a)** each field becomes a single enriched object (`customerId: {id, name, label}` instead of `customerId: string`) — most likely intent, matches "instead of raw id strings, bring more info per reference", or
- **(b)** a separate flat array of all referenced entities attached to the response (e.g. `refs: [{id, type, name, label}, ...]`) so the frontend can look any of them up by id without duplicating name lookups across multiple fields — better if the same referenced entity (e.g. the tenant) repeats across many rows in a list response, avoids repeating the same name/label string on every row

Note (b) also composes naturally with the alarm-counters idea above if those ever get attached per-entity in a list response.

### Design considerations

- **Cost**: resolving `name`/`label` for each reference means an extra TB lookup per reference field, per entity, unless batched/cached. For a `GET /devices` list of N devices, naively resolving `customerId`'s name for each row is another N calls (or fewer if many rows share the same customer — batch-dedupe by unique id first, mirroring the `resolveScopedCustomerIds` dedup pattern already used in `EntitiesService`)
- **Caching**: tenant/customer/profile names change rarely — a good candidate for a longer-TTL Redis cache (unlike the existing ~3s telemetry cache), keyed by entity id
- **Where this lives**: likely a new small helper in `EntitiesService` (e.g. `resolveRefNames(ids: {id,type}[]): Promise<Map<string, {name,label}>>`), called from `toEntityRef`'s mapping step, batched across a whole list response rather than per-row
- **Scope of "label"**: `TbCustomer`/tenant don't have a `label` field in ThingsBoard's model (only Devices/Assets do) — for those, `label` would always be `null`; worth confirming this doesn't confuse frontend consumers expecting it to sometimes be populated
- **Backwards compatibility**: this changes the shape of every `EntityRef` response (`tenantId`/`customerId`/`assetProfileId`/`ownerId` go from `string` to an object, or move to a separate `refs` array) — a breaking change to the API contract; since no frontend consumes this yet (Phase 5+ not started), there's no migration cost today, but it should land before Phase 5 builds a typed client against the current flat-string shape

## Alarms API

Captured 2026-07-31, after Phase 3 Plan 03-02 shipped the first (read-only, single-filter) version of the Alarms REST + WS API. This section reviews what exists today against a richer set of requirements the user wants next.

### Current state (as of 03-02)

- `GET /entities/:id/alarms?type=` — per-entity alarms, forwards only pagination (`page`/`pageSize`/`sortProperty`/`sortOrder`), no `status`/`severity`/`type`/`textSearch` filters even though ThingsBoard's real endpoint (`GET /api/alarm/{entityType}/{entityId}`) supports them natively
- `GET /alarms?severity=&status=` — global, customer-hierarchy scoped, but only **one** severity and **one** status value at a time (not combinable lists), and no `type`/name filter at all
- `AlarmsGateway` (`/ws/alarms`) — live push via ~7s polling+diff (native TB `alarmDataCmds` not implemented, see Deferred Items in `03-02-SUMMARY.md`)
- No alarm mutation endpoints: no create, acknowledge, clear, comment, or edit `details`/`additionalInfo` from this API — ThingsBoard's Rule Engine is the only alarm writer today
- `TbAlarm` type (`thingsboard.types.ts`) only has: `id`, `type`, `severity`, `status`, `originator`, `startTs`, `endTs`, `ackTs`, `clearTs` — missing `createdTime`, `details`/`additionalInfo`, `acknowledged`/`cleared` booleans, `propagate*` flags, `assigneeId` (all of which the real TB API already returns — confirmed via a live test alarm during 03-02 verification)
- No alarm counters anywhere — `EntityRef` (devices/assets list items) has no alarm-related fields at all

### Requested improvements

**1. Combinable filters (status + severity + name/type, together)**

Today `severity`/`status` are single values on the global endpoint and absent entirely on the per-entity endpoint. Real ThingsBoard alarm queries support:
- Multiple severities/statuses at once (the TB REST API itself generally takes one `status`/`searchStatus` value per call per the confirmed `GET /api/alarm/{entityType}/{entityId}` contract — combining multiple severities would need either multiple TB calls merged client-side, similar to today's customer-hierarchy fan-out in `AlarmsService.getAllScoped`, or a switch to TB's `textSearch` for a lighter case)
- `textSearch` already exists on the real endpoint and matches against `type`/`severity`/`status` substrings — cheapest way to add "filter by alarm name" without redesigning the query shape
- Design note: extend `AlarmsService.getForEntity`/`getAllScoped` to accept `severities?: TbAlarmSeverity[]`, `statuses?: TbAlarmStatus[]`, `type?: string` (mapped to TB's `textSearch` or client-side filtered post-fetch, consistent with the existing merge-and-filter pattern in `getAllScoped`)

**2. Propagated alarms (Customer sees its Devices' alarms)**

ThingsBoard alarms already carry `propagate`, `propagateToOwner`, `propagateToOwnerHierarchy`, `propagateToTenant`, and `propagateRelationTypes` fields (confirmed present on a real alarm fetched during 03-02 verification) — this is a native TB mechanism, not something to reinvent:
- When an alarm is created with `propagateToOwner: true` (or `propagateToOwnerHierarchy`), ThingsBoard's own alarm query for the **owning Customer** entity (`GET /api/alarm/CUSTOMER/{customerId}`) should already include it — this needs to be verified against a real propagated alarm (not yet tested; 03-02 only tested a `DEVICE`-originated, non-propagated alarm)
- Today `AlarmsService.getForEntity` already accepts `entityType: 'CUSTOMER'` (the `EntityType` union includes it) but this path has never been exercised/verified
- Action: add a verification pass (create a real alarm with `propagateToOwner: true` on a Device belonging to a known Customer, then query `GET /entities/{customerId}/alarms?type=CUSTOMER` and confirm it appears) before building anything new — this may already work with zero code changes, just untested

**3. Alarm counters on entities/devices/assets (`countAlarms`, `countActiveAlarms`, `countCriticalAlarms`, etc.)**

No dedicated ThingsBoard "count alarms by severity" REST endpoint was confirmed during this session (only per-entity/global alarm *list* endpoints, plus a `highestSeverity`-style lookup seen in tooling exploration — worth confirming a real endpoint shape before committing to an approach). Two viable designs:
- **Computed**: fetch `getForEntity`'s full alarm page for an entity and tally counts server-side (reuses existing code, no new TB dependency) — cheap per-entity, but expensive if added to every row of a `GET /devices`/`GET /assets` list (N+1 alarm fetches per list call)
- **Cached**: same computation, but Redis-cached with a short TTL (mirrors the existing telemetry/attribute cache pattern in `TelemetryService`/`AttributesController`) — recommended if counters are added to list views, not just entity detail views
- Suggested fields on `EntityRef` (or a separate lightweight `AlarmCounts` type returned alongside, to avoid bloating every entity list response by default): `countAlarms`, `countActiveAlarms` (status starts with `ACTIVE_`), `countCriticalAlarms` (severity `CRITICAL`), and likely `countUnackAlarms` (status ends with `_UNACK`) since that's usually the operational number that matters most to an operator
- Design question to resolve before planning: should counts be **opt-in** (a separate `GET /entities/:id/alarms/count` endpoint, or a `?includeAlarmCounts=true` query flag on list endpoints) rather than always-on, to avoid silently making every device/asset list call N+1 expensive

**4. Centralized alarm type with full TB fields + user-editable `additionalInfo`**

Extend `TbAlarm` (or introduce a richer `AlarmInfo` type, matching what ThingsBoard's `AlarmInfo` DTO actually returns — confirmed fields from a live alarm during 03-02: `createdTime`, `acknowledged`, `cleared`, `assigneeId`, `assignTs`, `details`, `propagate*` flags, `originatorName`/`originatorLabel`/`originatorDisplayName`, `name`) to include everything the real API already gives us instead of the current narrow subset. `details` is ThingsBoard's own free-form JSON field (what the user is calling "additional info") — it's already settable via `saveAlarm` (confirmed working during 03-02: passed a `details: {message: "..."}` object when creating the test alarm) and updatable by re-calling `saveAlarm` with the alarm's `id` included (ThingsBoard's alarm endpoint is a POST-based upsert — **there's no native PUT verb for alarms in TB's REST API**, but the same POST endpoint acts as an edit when `id` is present, so our own `PUT /alarms/:id` or `PATCH /alarms/:id` would just wrap that POST-with-id call).

**5. Acknowledge/Clear actions + comments**

ThingsBoard has native endpoints for both, confirmed present in this project's available tooling: acknowledge, clear (already used once during 03-02 to clean up the test alarm), and delete. Comments are also a native TB alarm sub-resource (`GET`/`POST /api/alarm/{alarmId}/comment`) — not yet explored against this project's real instance, should be confirmed before planning. Suggested new endpoints, all thin wrappers over TB (matching this project's "never duplicate ThingsBoard data, always proxy" constraint from `PROJECT.md`):
- `POST /alarms/:id/ack` — acknowledge
- `POST /alarms/:id/clear` — clear
- `PUT /alarms/:id` (or `PATCH`) — update `details`/`additionalInfo` via TB's upsert-by-id `saveAlarm` call
- `GET /alarms/:id/comments`, `POST /alarms/:id/comments` — comment thread, if TB's comment API is confirmed to behave as expected
- All of the above need `CustomerScopeGuard`-equivalent scoping decided: today's guard only understands `Device`/`Asset`/`Customer` entities via `:id`+`type`, not `Alarm` as its own scoped resource — likely needs the alarm's `originator` resolved first (via the alarm's own `GET /api/alarm/{alarmId}` response, which includes `originator`), then the existing `isEntityInScope` check applied to that originator. This is new plumbing, not a copy-paste of the existing guard.
- Access control question to resolve before planning: should `reader`-role Customer Users be blocked from ack/clear/comment (read-only, matching their existing read-only `appRole`), while `admin`-role Customer Users and above can act? Today's `admin`/`reader` distinction (`AppSession.appRole`) is stored but not yet enforced anywhere (see `STATE.md` Decisions) — this would be the first real consumer of it.

**6. "Value" and active/cleared state visibility**

Alarms themselves don't carry a telemetry "value" in ThingsBoard's model — that's a Rule Engine concept (the rule chain that raised the alarm decided to include a value in `details` if it wants to, e.g. `{"temperature": 87.3, "threshold": 80}`). Once `details` is surfaced properly (see #4), any value the rule chain attached is already visible — no separate API needed, just don't drop the field. Active/cleared/acknowledged state is already fully present in TB's `status` enum (`ACTIVE_UNACK` / `ACTIVE_ACK` / `CLEARED_UNACK` / `CLEARED_ACK`) plus the boolean-ish `acknowledged`/`cleared` fields TB also returns — again, just needs to stop being dropped by our narrow `TbAlarm` type (see #4).

### Suggested order of attack (not yet scheduled)

1. Widen `TbAlarm`/introduce `AlarmInfo` type with the full TB field set (#4, #6) — unblocks everything else, no new endpoints needed, lowest risk
2. Combinable filters + `textSearch`/name filter (#1) — extends existing endpoints, no new scoping design needed
3. Ack/clear/comment endpoints (#5) — needs the new originator-based scoping plumbing, and a decision on `admin`/`reader` enforcement
4. Verify propagated alarms actually surface at the Customer level today (#2) — pure verification, might need zero code
5. Alarm counters (#3) — depends on deciding opt-in vs always-on and computed vs Redis-cached, likely the most design-heavy item here

---
*IMPROVEMENTS.md — created 2026-07-31, updated as new ideas surface*
