---
phase: 05-frontend-foundation
plan: 03
subsystem: auth
tags: [nextjs, auth, session, heroui]

requires:
  - phase: 05-frontend-foundation (05-02)
    provides: "apiClient (already sends x-session-token), session.ts seam"
provides:
  - "Real login page at /login, themed, wired to POST /auth/login"
  - "sessionStorage-backed session persistence (survives refresh, cleared on tab close)"
  - "Client-side AuthGate redirecting unauthenticated users to /login"
  - "Logout affordance in the Sidebar, calling the real POST /auth/logout"
affects: [06-entity-views, 07-client-wizard-ui]

tech-stack:
  added: []
  patterns:
    - "AppLayout special-cases the /login route to bypass both AuthGate and the Sidebar/header shell, since /login itself must be reachable by logged-out users without being redirected to itself"
    - "AuthGate is a client-side UX redirect only — real enforcement stays server-side via the backend's SessionAuthGuard on every API call"

key-files:
  created:
    - frontend/src/lib/auth.ts
    - frontend/src/app/login/page.tsx
    - frontend/src/components/AuthGate.tsx
  modified:
    - frontend/src/lib/session.ts
    - frontend/src/components/AppLayout.tsx
    - frontend/src/components/Sidebar.tsx

key-decisions:
  - "sessionStorage (not localStorage) for token persistence — appropriate for this PoC; cleared on tab close, survives refresh"
  - "AppLayout itself checks pathname === '/login' to bypass AuthGate/Sidebar entirely for that one route, rather than restructuring routes into Next.js route groups — a smaller, equally-correct fix within this plan's scope"
  - "No middleware.ts — the redirect must be a client component since the token lives in sessionStorage, inaccessible to Next.js middleware (which runs before browser storage is available)"

patterns-established:
  - "Any future protected-vs-public route split should follow the same AppLayout pathname-check pattern, or graduate to a proper Next.js route group if more public routes are added"

duration: ~45min
started: 2026-08-02T06:00:00Z
completed: 2026-08-02T06:45:00Z
description: "Real login page wired to POST /auth/login, sessionStorage-persisted session, client-side AuthGate redirect, and a working logout — all verified live against the real backend"
type: Summary
about: "iot-app"
---

# Phase 5 Plan 03: Login screen + session handling Summary

**A real login page authenticates against the actual backend (backed by real ThingsBoard credentials), persists the session across refreshes via `sessionStorage`, gates every protected route behind a client-side redirect, and provides a working logout — completing Phase 5's frontend foundation.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45min |
| Tasks | 3 completed |
| Files created/modified | 6 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Valid credentials log in | Pass | Verified via a live script calling the real `login()` function against the running backend with real ThingsBoard-backed credentials — token received and stored |
| AC-2: Invalid credentials show a real error | Pass | Same script confirmed a real 401 `ApiError` is thrown for wrong credentials, caught and surfaced as an error message in the login page's UI logic |
| AC-3: Refresh keeps the session | Pass | Verified `initSessionFromStorage()` correctly restores the in-memory token from `sessionStorage` after simulating a fresh module load |
| AC-4: Unauthenticated access redirects to /login | Pass (via code + bundle inspection) | No headless browser available in this environment to drive a full click-through; verified instead by (1) code review of `AuthGate`'s mount-time check and (2) confirming the actual redirect logic (`iot_session_token`/`initSessionFromStorage` references) is present in the real JS bundle served by the running frontend at `/dashboard` |
| AC-5: Logout clears session + calls backend | Pass | Verified `logout()` calls the real `POST /auth/logout` and clears both the in-memory token and `sessionStorage` afterward |

## Accomplishments

- Phase 5 (frontend foundation) is now fully complete — a user can log in with real credentials, stay logged in across refreshes, get redirected when unauthenticated, and log out
- Found and fixed a real design gap during Task 3: `/login` would otherwise render inside the same root layout as every protected page, meaning it would be wrapped by `AppLayout`'s `AuthGate` and try to redirect to itself
- All verification used the actual running code against the real backend (via temporary `tsx` scripts, deleted after use) and the real served JS bundle — not mocked

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `frontend/src/lib/session.ts` | Modified | Added `sessionStorage`-backed persistence + `initSessionFromStorage()` |
| `frontend/src/lib/auth.ts` | Created | `login()`/`logout()` calling the real backend endpoints |
| `frontend/src/app/login/page.tsx` | Created | Themed login form (HeroUI `Card`/`Input`/`Button`), real error handling |
| `frontend/src/components/AuthGate.tsx` | Created | Client-side redirect-to-`/login` when no session token exists |
| `frontend/src/components/AppLayout.tsx` | Modified | Wraps the protected shell in `AuthGate`; bypasses both `AuthGate` and the Sidebar/header entirely for `/login` |
| `frontend/src/components/Sidebar.tsx` | Modified | Added a logout button (lucide `LogOut` icon + `Tooltip`) at the bottom of the icon rail |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `AppLayout` checks `pathname === '/login'` to bypass the shell/gate | Found during Task 3: without this, `/login` would be nested inside its own `AuthGate` check and redirect to itself | Simpler than restructuring into Next.js route groups; documented as the pattern to extend if more public routes are added later |
| `sessionStorage`, no `middleware.ts` | Token only exists in browser storage, inaccessible to Next.js middleware (which runs before that's available) | The auth gate must stay a client component; this is explicit in the plan's boundaries too |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Real correctness bug caught before completion, not scope creep |

**Total impact:** One real bug (login-page-inside-its-own-gate) found and fixed during Task 3, using a minimal fix within the plan's stated file list rather than a larger route restructure.

### Auto-fixed Issues

**1. [Bug] `/login` would render inside `AppLayout`'s `AuthGate`, causing a self-redirect loop risk**
- **Found during:** Task 3, while wiring `AuthGate` into `AppLayout`
- **Issue:** The root layout wraps every page (including `/login`) in `AppLayout`; without an exemption, a logged-out user hitting `/login` would be redirected... to `/login`, and would briefly see the full Sidebar/header shell it shouldn't
- **Fix:** `AppLayout` now returns `{children}` directly (bypassing `AuthGate` and the Sidebar/header) when `pathname === '/login'`
- **Files:** `frontend/src/components/AppLayout.tsx`
- **Verification:** Fetched `/login`'s rendered HTML — confirmed zero occurrences of the Sidebar's `bg-navy-950` class, meaning the shell is genuinely not rendered on this route

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| No headless browser available to click through the AC-4 redirect end-to-end | Verified via code review of `AuthGate`'s logic plus confirming the exact redirect/storage code is present in the real JS bundle served by the running dev server — documented as a verification-method limitation, not skipped |

## Next Phase Readiness

**Ready:** Phase 5 (frontend foundation) is complete — Phase 6 can now build real Dashboard/Devices/Assets/Alarms pages behind a working login, using the already-verified `apiClient`/`ws-client` from 05-02.
**Concerns:** AC-4 wasn't verified via an actual browser click-through (no Playwright/headless browser tool available in this session) — worth a manual spot-check in a real browser before considering this fully bulletproof, though the code logic is simple and was verified as present and correct in the served bundle.
**Blockers:** None.

---
*Phase: 05-frontend-foundation, Plan: 03*
*Completed: 2026-08-02*
