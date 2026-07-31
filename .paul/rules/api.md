# API Rules

## Telemetry value contract

- Telemetry values are never stored in Postgres — ThingsBoard is the single source of truth, in the category's base unit (see `unit_categories.base_unit`).
- Endpoints returning telemetry values (latest or historical) must serialize the value as a **string**, never as a JS `number` — mirrors ThingsBoard's own `valueAsString` field and avoids silent float precision loss on large/long decimals.
- The response payload includes `decimals` (from `telemetry_definitions`) alongside the raw string value. Rounding for display happens in the frontend, never on the backend.
- Aggregates (avg/min/max) are computed by ThingsBoard's own aggregation API (double-precision) — never recomputed backend-side from an already-rounded display value.
- Unit conversion for display (`stored_value * factor + offset`, per `unit_conversions`, resolved against the requesting user's `user_unit_preferences`) happens at read time in the API — the DB never holds a converted copy of a value.

## Auth & session contract

- Auth is a two-step handshake: `POST /auth/login` exchanges TB end-user credentials for the app's own session token, returned to the client and passed back as the `x-session-token` header on every subsequent request. ThingsBoard's own JWT never reaches the frontend.
- `SessionAuthGuard` resolves `x-session-token` → `AppSession` (via Redis) on every request except routes marked `@Public()`. A missing/invalid token is a 401, not a redirect — this is an API, not a web session with cookies.
- `RolesGuard` + `@Roles()` decorator gate sysadmin-only routes: only `TENANT_ADMIN`/`SYS_ADMIN` authorities satisfy a `SYSADMIN` role requirement (`common/guards/roles.guard.ts`).

## Customer-hierarchy scoping (CustomerScopeGuard)

- Enforced per-entity, not globally: the guard only scopes routes that have both an `:id` param and a `type` query (entity-scoped GET/PATCH routes). List endpoints are not scoped at the guard level — scoping there is the service's responsibility.
- `TENANT_ADMIN`/`SYS_ADMIN` bypass scoping entirely. A `CUSTOMER_USER` may reach an entity only if it belongs to their own `customerId` or a descendant sub-customer.
- Sub-customer hierarchy has no native TB CE concept — it's expressed as `Customer -> Customer` relations of type `"Contains"`, walked via TB's `/api/relations` endpoint (BFS, cycle-safe via a visited set). Any endpoint or fixture assuming customer hierarchy must use this same relation type — don't invent a second one.
- An entity with no resolvable owning customer, or a session with no `customerId`, is a `403 Forbidden` ("Entity has no resolvable customer scope"), never a silent bypass.

## Entity type contract

- `EntityType` is currently `'DEVICE' | 'ASSET' | 'CUSTOMER'` (see `entities.controller.ts`). Any new entity-scoped endpoint must reuse this union rather than introducing a parallel type string.
- Entity ids passed as route params go through `ParseTbIdPipe` (`common/pipes/tb-id.pipe.ts`) — don't accept raw unvalidated id strings in new controllers.

## Error format

- ThingsBoard error responses are unwrapped and re-thrown as a NestJS `HttpException` carrying TB's own `message` field and status code where available (`throwForFailedResponse` in `thingsboard-client.service.ts`) — don't wrap TB errors in a generic 500 unless TB itself returned a non-JSON body.
