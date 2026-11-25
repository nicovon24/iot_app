---
phase: 14-instance-aware-dashboard-assistant
plan: 03
status: implemented
date: 2026-11-21
---

# Dashboard assistant interface

The IoTArg assistant separates conversation and configuration. The chat displays model replies, history, pending state, inline generation errors, and a draft preview. The editor summarizes added, changed, moved, and removed widgets. Users may apply, edit, discard, and explicitly save. A newly created dashboard links its conversation only after save. Readers do not see the assistant.

Verification: frontend typecheck, lint, and 95 Vitest tests pass. Playwright CLI with local frontend and mocked API verified connection creation, two-turn generation, editing an existing dashboard with unsaved changes, desktop and 390px mobile layout, explicit save, conversation linking, and READER gating. Nest returned HTTP 401 for unauthenticated POST to the connection route, confirming it exists. A real provider/ThingsBoard browser flow remains unverified.
