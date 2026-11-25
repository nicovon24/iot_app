---
phase: 14-instance-aware-dashboard-assistant
plan: 02
status: implemented
date: 2026-11-21
---

# AI connections and draft generation

Users with dashboard edit permission can save multiple encrypted AI connections per ThingsBoard instance, select a model, set daily request and response token limits, and resume private conversations. Built-in adapters cover OpenAI, Anthropic, Gemini, Groq, and OpenRouter. Custom chat-completion URLs require an administrator-approved HTTPS origin. Provider responses expose no key.

Generation sends a bounded catalog of visible entities, telemetry keys, and registered widget types. It does not send telemetry values. The response is validated against the catalog and widget registry before persisting a conversation draft. Existing dashboards and manual editor changes can be revision context. Generated drafts never save a dashboard automatically.

Verification: 56 backend Jest tests pass, including isolation, limits, concurrency, invalid output, catalog scope, revision context, and no dashboard write. Backend typecheck and lint pass. Prisma migrations applied to a disposable database. Real provider calls and an existing-data migration fixture remain unverified.
