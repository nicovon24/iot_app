# PROJECT.md — IoT Platform

Resumen de una sola pieza para dar contexto a otra IA (diagramas, brainstorm, revisión). Fuente de verdad detallada: `VISION.md`, `ARCHITECTURE.md`, `STACK.md`, `docs/schema.dbml`, `docs/rules/`.

## Qué es

PoC de plataforma IoT: ThingsBoard como motor de datos (devices, assets, telemetry, rule engine), con un frontend propio mucho más flexible que la UI nativa de TB. Objetivo secundario: practicar un servicio NestJS end-to-end.

Usuarios: operadores y administradores industriales. UI en español, código/docs en inglés.

## Principios

- Nunca duplicar entidades nativas de ThingsBoard en Postgres (Tenant, Client, Asset, Device, Attributes, Telemetry, Relations, Rule Chains)
- Jerarquía y white-labeling configurables por Client
- Sin capa de eventos nueva — quedarse cerca de las capacidades de TB

## Stack

**Backend**
- NestJS + Fastify adapter
- Auth: guard propio contra ThingsBoard, JWT cacheado en Redis
- ORM: Prisma → PostgreSQL
- Redis: cache de JWT + resultados de agregación de telemetría
- WebSockets (`@nestjs/platform-ws`): telemetría live + alarmas
- API: REST + Swagger/OpenAPI (GraphQL descartado)
- Validación: class-validator + class-transformer
- Rate limit: solo en login (`@nestjs/throttler`)

**Frontend**
- React + Zustand (estado UI: selección, filtros, layout)
- TanStack Query (estado servidor: telemetría, listados, polling)
- react-grid-layout (dashboards armables/pineables)
- Recharts (gráficos)
- React Hook Form + Zod (formularios)

**Testing**: Jest (unit), Playwright (e2e API + frontend), Redis real en integration tests de auth.

**Infra**: Docker/docker-compose local, Dockerfile multi-stage para API. Deploy: Supabase (DB), Render (API), Vercel (frontend). CI/CD: GitHub Actions (lint → test → build → e2e), branch protection en `main`.

## Arquitectura

```
Frontend (React) → NestJS (auth + lógica de negocio) → ThingsBoard (entidades, telemetría, rule engine)
        ↑                        ↓
        └── WebSocket (telemetría live, proxeada por NestJS)
                              ↓
                        PostgreSQL (metadata híbrida)
```

- ThingsBoard: dueño de Tenants, Customers (Clients), Assets, Devices, Attributes, Telemetry, Relations, Rule Chains
- PostgreSQL: solo metadata híbrida — jerarquía, catálogo de telemetría/unidades, dashboards, favoritos, roles/permisos, destinatarios de alarmas

### Modelo de entidades

| Capa | Storage |
| :--- | :--- |
| Tenant, Client, User | ThingsBoard nativo |
| Location/Area/nivel intermedio | ThingsBoard Asset (`hierarchyLevelId` attr + relación "Contains") |
| Sensor/Gateway | ThingsBoard Device |
| Labels de jerarquía por Client | `hierarchy_level_definitions` |
| Relaciones custom (no jerarquía) | ThingsBoard Relations nativo + labels en `relation_type_definitions` |
| Tipos lógicos de telemetría | `telemetry_definitions` (global) |
| Conversión de unidades | `unit_categories`, `unit_conversions` (global) |
| Preferencia de unidad por usuario | `user_unit_preferences` |
| Condición de alarma | ThingsBoard Rule Chain; destinatarios en `alarm_recipients` |
| Permisos granulares | `roles` + `user_role_assignments`, escopeados a `tb_entity_id` genérico |

Schema completo: `docs/schema.dbml`.

### Tiempo real

WebSocket único para telemetría live y alarmas, proxeado por NestJS (credenciales TB nunca llegan al cliente). Alarmas también van por email (`alarm_recipients`) independientemente del WebSocket.

### Dashboards y permisos

- `dashboard_configs`: layout + bindings de widgets (jsonb), tipo `entity | solution | custom`, `created_by` (siempre conserva acceso), `visible_to_role_id` opcional para targetear un rol específico
- `roles.permissions` (jsonb): visibilidad default por tipo de dashboard, por rol
- Roles libres por Client (manager, operator, admin...), sin enum fijo
- Catálogo de widgets (tabla, chart, mapa, gauge, badge, card) es el mismo para todos — no hay restricción de widgets por rol, solo de visibilidad de dashboard

## Funcionalidad a construir

**Stage 1 (backend)**
- Auth NestJS ↔ ThingsBoard
- CRUD devices, assets, attributes, telemetry sobre TB
- Jerarquía configurable por Client (niveles custom)
- Catálogo de telemetría + unidades + preferencias por usuario

**Stage 2 (frontend)**
- Explorador de telemetría: cualquier sensor/key, historial y agregados (avg/max/min) en cualquier rango
- Dashboards armables por el usuario (entity / solution / custom), elección de visualización por key
- Favoritos (dashboards, entidades, vistas de telemetría)
- Alarmas: recepción vía WebSocket + email

**Backlog cercano (no iniciado)**
- Wizards de onboarding admin: alta de Client, alta de Asset, alta de Device+linking (el wizard de device también crea su estructura default de assets a partir de `hierarchy_level_definitions`, no arranca de cero)
- Revisión de roles/permisos: tipos de usuario (manager, operario, ...) con dashboards visibles según rol Y según quién los creó / para quién fueron creados (`created_by` + `visible_to_role_id`)

## Fuera de scope (PoC)

- Branding de dominio/login custom
- Reemplazar el Rule Engine de ThingsBoard
- Onboarding físico de hardware (provisioning real de devices) — distinto de los wizards de arriba, que son formularios admin

## Referencia de telemetría

Device emulado inicial: bomba/estación industrial. Keys: `alarmCode`, `energy`, `flowRate`, `latitude`, `longitude`, `mode`, `motorSpeed`, `power`, `pressure`, `state`, `temperature`, `vibration`, `volume`.

## Estado actual

Ver `CURRENT.md` para lo último trabajado y próximos pasos día a día. Este archivo (`PROJECT.md`) es un snapshot para compartir contexto — no reemplaza VISION/ARCHITECTURE/STACK como fuente de verdad, actualizar a mano si hay cambios grandes de scope o stack.
