# Backend Modules — iot_app

Module diagram based on the actual NestJS `@Module()` decorators in the code (`backend/src/**/*.module.ts`), as of 2026-07-31 (end of Phase 2.2).

Stack: NestJS 10 + `@nestjs/platform-fastify`, `ioredis`, ThingsBoard as the data backend (no Prisma/PostgreSQL in the code yet).

## Overview — bootstrap and global guards

```mermaid
graph TD
  APP["AppModule (root)"]
  CFG["ConfigModule (@Global)"]
  AUTH["AuthModule"]
  DOM["Domain modules\n(Entities, Devices, Assets,\nCustomers, Attributes, Telemetry, Users)"]
  TB["ThingsboardModule"]
  GUARDS["APP_GUARD:\nSessionAuthGuard -> CustomerScopeGuard"]

  APP --> CFG
  APP --> AUTH
  APP --> DOM
  APP --> GUARDS
  AUTH --> TB
  DOM --> TB
```

`SessionAuthGuard` is registered before `CustomerScopeGuard` in `AppModule` — the order matters (a real bug is documented in the code from when they were registered in separate modules).

## Domain: shared infrastructure (ThingsBoard + Redis)

```mermaid
graph TD
  TBMOD["ThingsboardModule"]
  TBCLIENT["ThingsboardClientService\n(single HTTP chokepoint to TB)"]
  REDIS["RedisService (ioredis)"]
  TBAPI["ThingsBoard REST API\n(login, customers, devices, assets, users)"]
  REDISDB[("Redis\ncache + sessions")]

  TBMOD --> TBCLIENT
  TBMOD --> REDIS
  TBCLIENT -->|"cached JWT: tb:jwt"| REDIS
  TBCLIENT --> TBAPI
  REDIS --> REDISDB
```

Redis is used purely as a key/value cache (`get`/`set`/`del`/`delByPattern`) — no pub/sub, no queues (BullMQ) implemented.

## Domain: auth and sessions

```mermaid
graph TD
  AUTHMOD["AuthModule"]
  AUTHSVC["AuthService"]
  SESSGUARD["SessionAuthGuard (global)"]
  SCOPEGUARD["CustomerScopeGuard (global)"]
  TBCLIENT["ThingsboardClientService"]
  REDIS["RedisService"]

  AUTHMOD --> AUTHSVC
  AUTHSVC -->|"loginWithCredentials / getUserProfile"| TBCLIENT
  AUTHSVC -->|"app:session:&lt;uuid&gt;, TTL 8h"| REDIS
  SESSGUARD -->|"getSession()"| AUTHSVC
  SCOPEGUARD -->|"resolveScopedCustomerIds"| TBCLIENT
```

Own session mechanism based on an opaque token (never exposed to the frontend as a JWT): ThingsBoard's real JWT never reaches the browser.

## Domain: entities (devices, assets, customers)

```mermaid
graph TD
  ENTMOD["EntitiesModule"]
  ENTSVC["EntitiesService"]
  DEVMOD["DevicesModule"]
  ASSETMOD["AssetsModule"]
  CUSTMOD["CustomersModule"]
  TBCLIENT["ThingsboardClientService"]

  DEVMOD -->|"reuses"| ENTSVC
  ASSETMOD -->|"reuses"| ENTSVC
  CUSTMOD -->|"reuses"| ENTSVC
  ENTMOD --> ENTSVC
  ENTSVC --> TBCLIENT
```

`DevicesModule`, `AssetsModule` and `CustomersModule` are thin wrappers with no providers of their own: they import `EntitiesModule` and reuse `EntitiesService`.

## Domain: telemetry and attributes

```mermaid
graph TD
  ATTRMOD["AttributesModule"]
  TELMOD["TelemetryModule"]
  ATTRSVC["AttributesService"]
  TELSVC["TelemetryService"]
  TBCLIENT["ThingsboardClientService"]
  REDIS["RedisService"]

  ATTRMOD --> ATTRSVC
  TELMOD --> TELSVC
  ATTRSVC --> TBCLIENT
  TELSVC --> TBCLIENT
  TELSVC -->|"cache latest ~3s"| REDIS
  ATTRSVC -->|"invalidates cache on write"| REDIS
```

Time-series aggregation (`agg`, `interval`) is always delegated to ThingsBoard, never computed locally.

## Domain: users and roles

```mermaid
graph TD
  USERSMOD["UsersModule"]
  USERSSVC["UsersService"]
  ROLESGUARD["RolesGuard (@Roles('SYSADMIN'))"]
  TBCLIENT["ThingsboardClientService"]

  USERSMOD --> USERSSVC
  USERSSVC --> TBCLIENT
  USERSMOD -.->|"UseGuards at controller level"| ROLESGUARD
```

`RolesGuard` is only used today on `UsersController`; every other endpoint relies solely on the global guards.

## Pending / planned (not yet coded)

- **WebSockets** (Phase 3, "Not started"): `telemetry.gateway.ts` and `alarms.gateway.ts` don't exist; `@nestjs/websockets` is a declared dependency but unused.
- **Alarms module**: doesn't exist (`alarms/` hasn't been created).
- **Prisma/PostgreSQL** (Phase 4, "Not started"): no `schema.prisma`, no `@prisma/client`, no `PrismaService` in the repo.
- **Static tenant/client/location/area hierarchy** via `client_hierarchy_levels`: planned only, not implemented.
