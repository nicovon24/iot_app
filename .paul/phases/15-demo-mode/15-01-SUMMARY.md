# 15-01 — Isolated product demo summary

## Delivered

- Added anonymous demo entry on the login page and a persistent simulated-data banner with exit.
- Routed the existing REST and WebSocket clients to a browser-only fixture adapter in demo mode; the normal session path remains intact.
- Seeded customers, assets, devices, telemetry, alarms, users, maps, and a four-widget dashboard.
- Added a local assistant simulator that proposes a widget from a prompt, supports preview and dashboard save, and stores conversations in session storage. Adding a widget to an existing dashboard preserves its widgets.
- Marked the assistant as a simulator and replaced live indicators in the overview and map during demo sessions.

## Verification

- `npm run lint --workspace=frontend` — pass.
- `npm run typecheck --workspace=frontend` — pass.
- `npm run test --workspace=frontend` — 104 pass, including preservation of existing widgets and unknown-entity rejection.
- `npm run build --workspace=frontend` — pass.
- Playwright CLI — anonymous entry, nine navigation and detail routes, assistant table proposal and saved dashboard, mobile entry and exit; no browser console errors. Backend was not running during these checks.
- `git diff --check` — pass; line-ending notices only.

## Limits

- The demo assistant uses deterministic local rules, not an LLM. It demonstrates the editor flow for table, map, gauge, and chart prompts.
- Dashboard editing is simulated. Other mutation controls report an explicit unavailable action and never reach the backend.
- Session data resets when the visitor exits demo or closes the browser tab.

## Git

The demo and English UI changes are awaiting the reviewed production PR. Pre-existing unrelated workspace edits were left untouched.
