# AI Handoff

AI assistants should read this file first to understand the project quickly.
For portfolio wording and the longer improvement TODO, read `docs/portfolio-roadmap.md`.

## What This Project Is

`ssh-reports-hub` is the React frontend for a securities report collection system.
It displays reports collected by the `ssh-reports-scraper` backend pipeline and supports recent/global/industry views, search, favorites, sharing, Telegram auth, and keyword alert management.

## System Context

- The scraper/backend side has moved report storage toward PostgreSQL as the single source of truth.
- Oracle ATP / ORDS dependencies are being removed from the broader system.
- Scraper source URLs, tokens, VPN hostnames, generated env files, and secrets must not be committed.
- Backend reference docs live in:
  - `/home/ubuntu/prod/ssh-reports-scraper/docs/architecture.md`
  - `/home/ubuntu/prod/ssh-reports-scraper/docs/changelog.md`

## Frontend Hotspots

- `src/utils/api.js`
  - API base URL normalization.
  - Has lightweight Node built-in tests in `src/utils/api.test.js`.
- `src/hooks/useReportFetch.js`
  - Currently owns report URL building, fetch, pagination, response normalization, and merge behavior.
  - Next refactor target: extract a pure report URL builder.
- `src/components/Header.jsx`, `src/components/SearchOverlay.jsx`, `src/context/ReportContext.jsx`
  - Search state is distributed across component state, context, and URL query params.
- `src/components/HamburgerMenu.jsx`
  - UI, Telegram auth, and keyword sync are mixed.
  - Split only after API behavior is better covered.

## Current Order Of Work

1. Finish focused API/helper tests.
2. Extract report URL builder from `useReportFetch`.
3. Extract report normalization and merge helpers.
4. Add a small API client wrapper.
5. Simplify search state.
6. Split auth/keyword hooks out of `HamburgerMenu`.
7. Update README/portfolio documentation.

## Verification

- Run `npm run test:api` after touching `src/utils/api.js`.
- Run `npm run lint` and `npm run build` when dependencies are installed.
- Avoid full dependency installs when local disk space is low.

