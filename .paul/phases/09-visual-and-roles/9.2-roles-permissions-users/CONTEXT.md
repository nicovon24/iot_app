# Phase Context

**Phase:** 9.2 — Roles enforcement & user management
**Generated:** 2026-08-05
**Status:** Ready for planning

## Goals

- Close the current security gap: `appRole` (`ADMIN`/`READER`) is stored on TB Customer Users but never enforced anywhere except `SYSADMIN`-gated endpoints. Today any authenticated Customer User — `admin` or `reader` — can write/edit/delete anything within their customer scope.
- `READER` becomes truly read-only: **zero write access, no exceptions.** Blocked from every mutating call within their scope — attribute writes, Asset create/edit/delete, Device assign/unassign, Customer edits, everything. Confirmed explicitly by the user: "solo mirar y punto, no debe poder cambiar nada."
- `ADMIN` keeps full write access within their customer scope (unchanged from today's de facto behavior).
- `SYSADMIN` (Tenant Admin) stays unrestricted, as today.
- Tenant/sysadmin can manage users from the frontend: create and delete `admin`/`reader` Customer Users. Backend (`users` module, Phase 2.2) already supports create/list/delete — only the UI is missing.
- Sysadmin can "login as" any user (impersonation), to see the app exactly as that user would, with an audit trail from day one (who impersonated whom, when it started, when it ended).

## Approach

- **Enforcement mechanism:** a new guard (or an extension of the existing `RolesGuard`) that blocks mutating HTTP methods (POST/PATCH/DELETE) whenever `session.appRole === 'READER'`. Runs alongside the existing global guards (`SessionAuthGuard` → `CustomerScopeGuard`) already registered in `app.module.ts`'s `providers` array — same registration pattern, same ordering discipline (see STATE.md's guard-ordering bug history, must not repeat it).
- `SYSADMIN`-only endpoints (already gated via `@Roles('SYSADMIN')`) are unaffected — this is a new, separate check layered on top, not a replacement for `RolesGuard`.
- **User management UI:** new frontend section (sysadmin-only, likely alongside or near `/admin`), consuming the existing `users` module endpoints as-is — no new backend needed for create/list/delete.
- **Impersonation:**
  - New sysadmin-only backend endpoint that mints a session carrying the target user's `customerId`/`appRole`/`tbUserId` (same session shape `AuthService` already produces at login).
  - New Postgres table (Prisma) — working name `ImpersonationLog` — with `impersonatorId`, `targetUserId`, `startedAt`, `endedAt`. This is the first Postgres write tied to auth/session rather than hierarchy metadata; follows the project's existing Prisma conventions.
  - Frontend: a "Login as" action on the Users screen, and a persistent banner while impersonating ("Viewing as {user}") with a clear way back to the sysadmin's own session.

## Constraints

- No área/asset-level permission granularity in this phase — that stays deferred per existing project constraint (ThingsBoard CE has no Entity Groups; still no design chosen).
- No changes to the `ADMIN` role's capabilities — this phase only tightens `READER`, it doesn't expand or restrict `ADMIN`.
- Dashboards (user-creatable/shareable, `react-grid-layout`) are explicitly out of scope here — tracked separately as Phase 10.
- Visual modernization (Phase 9.1) is independent of this phase — no shared code, can be planned/executed in either order.
- Follow the project's existing "TB is the source of truth" boundary — `appRole` continues to live in TB user `additionalInfo.appRole`, no parallel role table; only the new `ImpersonationLog` is a genuinely new Postgres concern (auth/session data has no TB equivalent to proxy).

## Open Questions

- Exact route/placement of the Users management screen in the nav (new top-level "Users" item vs. folded into `/admin`) — to be resolved at planning time.
- Whether impersonation sessions should have a shorter TTL than normal sessions, and whether they should be visibly distinguishable to the impersonated user's own future logins (not raised by the user yet, worth surfacing during planning).
- Whether ended impersonation sessions should be revocable/killable by the sysadmin mid-session (not raised yet).

## Additional Context

- This gap was found by grepping the backend for `appRole`/`RolesGuard`/`@Roles` usage — confirmed `appRole` is read at login (`auth.service.ts`) and stored at user creation (`users.service.ts`), but the only route-level enforcement anywhere is `@Roles('SYSADMIN')` on `customers`/`users` controllers. No controller checks `ADMIN` vs `READER`.
- Split from a larger ask that also included visual modernization and user-creatable/shareable dashboards — user agreed to split into three phases: 9.1 (visual modernization), 9.2 (this phase — roles/users), and 10 (dashboards), rather than bundling into one large plan.

---

*This file is temporary. It informs planning but is not required.*
*Created by /paul:discuss, consumed by /paul:plan.*
