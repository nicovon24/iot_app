# 15-02 — English UI consistency summary

## Delivered

- Translated the ThingsBoard instance field, demo entry and exit, assistant tabs and settings, preview and editor notices, sidebar label, seeded entities, alarms, and dashboard titles into English.
- Updated the backend assistant instruction and deterministic table message to English.
- Fixed date and time rendering to use English locale labels across the frontend.
- Advanced the demo storage version so existing browser demo sessions receive the new English fixtures.
- Updated project language guidance to match the active English UI decision.

## Verification

- Frontend lint, typecheck, 104 tests, and production build passed after review fixes.
- Backend lint, typecheck, and 17 dashboard assistant tests passed.
- Playwright CLI verified English login, demo data, dashboard, assistant help, settings, and table proposal. No Spanish copy remained in the checked screens.
- Source scan found only Spanish prompt compatibility patterns, a historical code comment, and Spanish test inputs. `git diff --check` passed.

No database migration is required.
