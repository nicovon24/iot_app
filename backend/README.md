# IoT App Backend

A NestJS + Fastify service that proxies [ThingsBoard](https://thingsboard.io/), exposing a simplified REST API for entities, devices, assets, customers, attributes, and telemetry. ThingsBoard remains the source of truth for tenants, customers, assets, devices, telemetry, and attributes — nothing is duplicated locally.

## Tech Stack

- **[NestJS](https://nestjs.com/)** 10 running on the **Fastify** adapter
- **TypeScript** 5
- **Zod** for environment/config validation
- **class-validator** / **class-transformer** for DTO validation
- **ioredis** for session storage (Redis)
- **ws** / `@nestjs/websockets` for WebSocket support
- **Swagger** (`@nestjs/swagger`, `@fastify/swagger`) for API documentation

## Architecture

The app authenticates against ThingsBoard once per session and stores the resulting session token in Redis, so downstream requests don't need to re-authenticate with ThingsBoard on every call.

```
src/
├── auth/           # Login endpoint, session token issuance
├── config/         # Zod-validated environment configuration
├── thingsboard/    # ThingsBoard HTTP client + Redis-backed session service
├── entities/       # Generic ThingsBoard entity lookups
├── devices/         # Device CRUD
├── assets/          # Asset CRUD
├── customers/       # Customer endpoints
├── attributes/      # Get/set entity attributes
├── telemetry/       # Telemetry read/write
├── common/          # Shared decorators, guards, DTOs
├── app.module.ts
└── main.ts
```

Requests are protected by a `SessionAuthGuard` that validates the `x-session-token` header against the session stored in Redis, except for routes marked `@Public()`.

## Prerequisites

- Node.js 18+
- A running ThingsBoard instance (URL + credentials)
- A running Redis instance

## Environment Variables

Create a `.env` file in this directory:

| Variable               | Required | Default                  | Description                          |
|-------------------------|:--------:|---------------------------|---------------------------------------|
| `THINGSBOARD_URL`       | yes      | —                          | Base URL of the ThingsBoard instance  |
| `THINGSBOARD_USERNAME`  | yes      | —                          | ThingsBoard login username            |
| `THINGSBOARD_PASSWORD`  | yes      | —                          | ThingsBoard login password            |
| `REDIS_URL`             | no       | `redis://localhost:6379`  | Redis connection string               |
| `PORT`                  | no       | `3001`                    | Port the API listens on               |

Configuration is validated at startup via [`config.schema.ts`](src/config/config.schema.ts) — the app fails fast if required variables are missing or malformed.

## Getting Started

```bash
# install dependencies
npm install

# run in watch mode
npm run start:dev

# build for production
npm run build

# run the compiled build
npm run start

# lint
npm run lint

# run tests
npm test
```

The API listens on `0.0.0.0:<PORT>` (default `3001`).

## API Documentation

Once the server is running, Swagger UI is available at:

```
http://localhost:<PORT>/api/docs
```

Authenticate via `POST /auth/login`, then pass the returned session token as the `x-session-token` header (configured in Swagger as the `session-token` API key scheme) for subsequent requests.

## Modules Overview

- **Auth** — exchanges ThingsBoard credentials for a session token.
- **ThingsBoard** — internal HTTP client and Redis-backed session management used by all other modules.
- **Entities** — generic entity lookup across ThingsBoard entity types.
- **Devices / Assets / Customers** — CRUD-style endpoints scoped to each entity type.
- **Attributes** — read/write entity attributes (client/server/shared scopes).
- **Telemetry** — read/write time-series telemetry data.

## Related Docs

- Root [AGENTS.md](../AGENTS.md)
- [docs/rules/api.md](../docs/rules/api.md)
