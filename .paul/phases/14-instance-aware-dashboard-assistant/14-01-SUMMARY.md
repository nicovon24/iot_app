---
phase: 14-instance-aware-dashboard-assistant
plan: 01
status: implemented
date: 2026-11-21
---

# Instance-aware login and data isolation

The login now accepts an approved ThingsBoard URL and defaults to `https://thingsboard.cloud`. App sessions retain the chosen origin. Local metadata and dashboard queries are scoped by that origin; legacy rows are assigned to the configured original instance during Prisma startup. The backend keeps ThingsBoard credentials server-side.

The implementation was committed in `abc91b8` and `ae028be`. All nine Prisma migrations applied to a disposable local PostgreSQL database. Backend typecheck and unit tests passed. A live login against multiple ThingsBoard instances was not run because no separate test tenant credentials were supplied.
