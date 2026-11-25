---
phase: 14-instance-aware-dashboard-assistant
plan: 04
status: implemented
date: 2026-11-21
---

# Fleet table intent

The dashboard assistant now gives the model an all-device entity table shape and enforces explicit all-sensors table requests after parsing. Such requests produce one `attributes-table` widget with `entityScope: ALL` and `entityType: DEVICE`, even if the provider returns cards. Telemetry columns named in the request are selected when they match catalog keys; otherwise the table uses the telemetry wildcard. The frontend preview names the table's rows and columns before applying it.

The entity table now requests 20 devices per page and exposes previous/next controls. Its telemetry queries run only for the current page. Pagination remains clickable in dashboard edit mode. No dashboard is saved by generation.

Verification: backend Jest 60/60, frontend Vitest 99/99, both lint and typecheck, and both production builds passed. Playwright CLI with mocked session, provider, and 25 devices verified the preview, wildcard columns, first page, and second page while editing. Real ThingsBoard and provider calls were not made. The wildcard resolves keys from each displayed page, so columns may differ between pages.
