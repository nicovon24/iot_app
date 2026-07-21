# IoT Smart Industry Platform

FastAPI + ThingsBoard, with a flexible hierarchy and a dynamic frontend

Consolidated architecture reference: objective, flexible entity hierarchy,
ThingsBoard inheritance breakdown, alarm rules and white-labeling, frontend
navigation, and the development checklist.

---

## 1. Project objective

The core objective is to use **ThingsBoard as the underlying IoT data engine**,
build a **solid, scalable API** on top of it, and, most importantly, a
**frontend far more capable and flexible than ThingsBoard's native one**: both
the administrator and the end user can create their own dashboards and
solutions, select any sensor and telemetry key, see its full history, generate
aggregates (average, maximum, minimum) over any time range, and choose how to
visualize the data.

This project is explicitly framed as a **proof of concept**: its purpose is to
improve on ThingsBoard's frontend, to practice building a real FastAPI service
end to end, and, together with former coworkers, to explore whether something
better and more scalable can be built. Even so, the intent is to **build it
properly from day one**. The backend stays close to ThingsBoard's own
capabilities rather than introducing a new event-driven layer.

### Initial data source
ThingsBoard itself supports **emulating devices and assets** through its own
device profiles, without any physical hardware. This emulated data is the
initial data source, and the same integration can later point at real sensors
without architectural changes.

### Project stages
- **Stage 1:** a scalable FastAPI service that authenticates against
  ThingsBoard and exposes devices, assets, telemetry, and attributes.
- **Stage 2:** a dynamic frontend consuming this API, with per-sensor telemetry
  exploration, aggregation, and fully user/admin-configurable dashboards.

---

## 2. Flexible entity hierarchy

Baseline hierarchy: **Tenant → Client → Location → Area → Asset →
Sensor/Gateway** (names distinct from ThingsBoard's own, to differentiate the
product). Clients can be nested recursively (e.g. IAC as a parent with Clarios
and Lhoist as sub-clients).

**Key requirement:** the hierarchy must be configurable per Client. Some
Clients won't use intermediate levels at all; others will want different
labels and a different number of levels (e.g. Country / Data Center / Section
instead of Location / Area).

### How this is solved
- A **single generic relation type** (e.g. "Contains") is used for every
  parent-child link in the tree, regardless of what the level represents.
- Each intermediate node is still a ThingsBoard **Asset**, tagged with a
  **hierarchyLevelId** attribute that points to a level definition.
- A custom table, **hierarchy_level_definitions** (id, tb_customer_id,
  level_order, label, icon), defines — per Client — which levels exist and
  what they are called.
- Permission scope is generic: roles point to any **tb_entity_id**, not to a
  fixed level name like "location" or "area".

---

## 3. Telemetry and attributes per entity

Every entity carries **telemetry** (time-series values, e.g. temperature,
pressure, flow rate) and **attributes** (single current values, e.g.
latitude, longitude, thresholds), both sourced from ThingsBoard. Attributes
can be edited from the frontend (e.g. lat/long via a map pin, thresholds via
a form).

### The Data Classifier
Suggests how to visualize each telemetry key (chart, card, gauge, badge),
combining: data type (native), unit (custom `telemetry_key_catalog` table,
since ThingsBoard doesn't provide units natively), and name/type heuristics
as fallback.

---

## 4. What inherits from ThingsBoard, entity by entity

Guiding rule: reuse what ThingsBoard already solves well; build a custom
table only for what it cannot express.

### A — Fully native
Tenant, Client (Customer), Users + base Authority, Assets, Devices
(Sensor/Gateway), Attributes, Telemetry, Relations.

### B — Modeled inside ThingsBoard via convention
- Location/Area/any intermediate level → Asset with `hierarchyLevelId`
- Nested Clients → native Relation between two Customers
- Theme/White-label → SERVER_SCOPE attributes on the Customer entity

### C — Hybrid
- **AlarmRule**: condition lives in the native Rule Chain; only
  `alarm_recipients (id, tb_rule_node_id, email)` is custom
- **Role/Permission**: base Authority is native; granular scope needs
  `roles (id, name, tb_entity_id)`

### D — Fully custom
hierarchy_level_definitions
telemetry_key_catalog
dashboard_configs
favorites
onboarding_flows

---

## 5. Alarm rules and white-labeling

Each Client can edit the alarm rules of its own Device Profiles directly and
configure which email addresses receive each alarm. White-labeling is scoped
to logo, color palette, and layout — no custom domain or login-page branding.

- [ ] Logo and favicon upload per Client
- [ ] Custom color palette per Client
- [ ] Custom layout preferences
- [ ] Fallback to a default theme

---

## 6. Frontend navigation

**Navbar**: Client selector, global search, notifications, profile.
**Leftbar** (collapsible), dynamic active section based on the selected
entity, grouped into:
- **Visualization:** Dashboards, Solutions, Favorites (pinnable)
- **Hierarchy:** Clients, Assets, Devices
- **Alarms:** Alarms, Alarm Rules, Notifications
- **Administration:** full CRUD of the hierarchy + onboarding flows/wizard

### Three dashboard types
| Type | Description |
|---|---|
| Entity dashboard | Automatic summary per hierarchy node |
| Solution dashboard | Pre-built template per use case |
| Custom dashboard | User-built, pinnable as default |

---

## 7. General architecture

Frontend → FastAPI (auth + business logic) → ThingsBoard (devices, assets,
telemetry, attributes, native Rule Engine). Data Classifier decides
visualization; email notifications for alarms. No new event-driven
infrastructure — the backend stays close to ThingsBoard's own capabilities.

---

## 8. ThingsBoard limitations addressed

| Limitation | Solution |
|---|---|
| Widget-by-widget dashboards, admin-only configuration | Scalable frontend, admin + end user build their own dashboards |
| Fixed hierarchy, no intermediate levels | Per-Client configurable hierarchy |
| No multi-brand support | Per-client white-labeling |
| No sensor+key aggregate explorer | Dedicated Telemetry Explorer |

---

## 9. Final development checklist

**Data model:** flexible hierarchy, nestable Clients, per-Client level
definitions, single generic relation type, telemetry+attributes per entity,
no duplication of ThingsBoard-native entities.

**Backend (Stage 1):** FastAPI + ThingsBoard auth, attribute CRUD, key
classifier, aggregation endpoints, dashboard/solution builder, alarm rules +
email recipients per Client, theming per Client, Bruno docs, docker-compose.

**Additional features:** granular roles/permissions, CSV/Excel export,
multi-tenancy, favorites, automated tests, presentation mode, AI integration,
onboarding wizard.

**Stage 2:** frontend dashboard/solution builder consuming the full API.

---