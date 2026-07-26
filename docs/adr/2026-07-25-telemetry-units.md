# ADR: Telemetry definitions, unit catalog, and per-user preferences

Date: 2026-07-25

Context for updating the project decision documentation. This ADR records decisions about telemetry typing, unit handling, and widget behavior.

## Telemetries UI

Decision: add a dedicated Telemetries section where a device and a telemetry key are selected, added to a telemetry-definitions database, and the historical value of that telemetry can be viewed (direct fetch to ThingsBoard's time-series API, formatted with the corresponding definition).

Rationale: centralizes configuration instead of reconfiguring each telemetry widget-by-widget, and provides a single place to review history using the same format used on dashboards.

## telemetry_definitions (global)

Decision: maintain a global `telemetry_definitions` table with one row per logical telemetry type (`sensor_telemetry`), not per device.

Structure:
```
telemetry_definitions
  id, sensor_telemetry, base_unit, decimals, min, max, default_widget
```

Rationale: the stored value is normalized to a base unit; grouping by type avoids duplicated definitions per device and aligns with the global unit catalog.

## unit_catalog

Decision: create a global unit catalog with `unit_categories` and `unit_conversions`.

Structure:
```
unit_categories: id, name, base_unit
unit_conversions: id, category_id, unit_code, factor, offset, label
```

Rationale: allows adding convertible units via rows rather than code changes. Use factor+offset for linear conversions; consider formula storage if non-linear conversions are required in the future.

## user_unit_preferences

Decision: allow users to set preferred display units per category.
```
user_unit_preferences: user_id, category_id, preferred_unit
```

Rationale: keeps stored telemetry in the base unit while providing per-user display flexibility.

## Dashboard widget behavior

Decision: dashboards can override only the `widget_type`; unit, decimals, min and max are taken from `telemetry_definitions` and cannot be overridden by dashboards. `min`/`max` can be nullable to allow dynamic calculation from historical data.

## Open questions
- Deletion/retention policy when a `telemetry_definitions` row is removed: block deletion when associated widgets exist, or provide a migration path.
- Mapping strategy for raw ThingsBoard keys to `sensor_telemetry` types.
- Storage format for non-linear conversion formulas if needed.
- UI form validation rules for creating/editing definitions.

---

This ADR summarizes the decisions formerly drafted in a working note and records them as the authoritative project decision.
