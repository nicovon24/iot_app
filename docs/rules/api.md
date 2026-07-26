# API Rules

## Telemetry value contract

- Telemetry values are never stored in Postgres — ThingsBoard is the single source of truth, in the category's base unit (see `unit_categories.base_unit`).
- Endpoints returning telemetry values (latest or historical) must serialize the value as a **string**, never as a JS `number` — mirrors ThingsBoard's own `valueAsString` field and avoids silent float precision loss on large/long decimals.
- The response payload includes `decimals` (from `telemetry_definitions`) alongside the raw string value. Rounding for display happens in the frontend, never on the backend.
- Aggregates (avg/min/max) are computed by ThingsBoard's own aggregation API (double-precision) — never recomputed backend-side from an already-rounded display value.
- Unit conversion for display (`stored_value * factor + offset`, per `unit_conversions`, resolved against the requesting user's `user_unit_preferences`) happens at read time in the API — the DB never holds a converted copy of a value.
