# VISION — IoTArg

## Why This Exists

Build a **proof of concept** that proves ThingsBoard can power a product with a **frontend far more capable and flexible** than ThingsBoard's native UI — while practicing a real NestJS service end to end with former coworkers.

## Product Goal

Use **ThingsBoard as the IoT data engine**. Expose a solid, scalable API on top. Deliver a frontend where admins and end users can:

- Create dashboards and solutions
- Select any sensor and telemetry key
- View full history and aggregates (avg, max, min) over any time range
- Choose how data is visualized

- Manage telemetry definitions and a global unit catalog so users can view data in preferred units (per-category user preferences) while stored values remain in a single base unit.

## Stages

| Stage | Scope |
| :--- | :--- |
| **Stage 1** | NestJS service — ThingsBoard auth, devices, assets, telemetry, attributes |
| **Stage 2** | Dynamic frontend — telemetry explorer, aggregation, user/admin-configurable dashboards |

## Initial Data Source

Emulated devices and assets via ThingsBoard device profiles — no physical hardware required. Same integration later supports real sensors without architectural changes.

## Design Principles

- Build properly from day one, even as a PoC
- Stay close to ThingsBoard capabilities — no new event-driven layer
- Never duplicate ThingsBoard-native entities in PostgreSQL
- Per-Client configurable hierarchy and white-labeling

## Target Users

Industrial operators and administrators (UI in Spanish). Platform documentation and code comments in English.

## Out of Scope (PoC)

- Custom domain / login-page branding
- Replacing ThingsBoard Rule Engine
- Physical device onboarding flows (initially)
