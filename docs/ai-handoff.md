# AI Handoff

This frontend is the report browsing UI for the `ssh-reports-scraper` system.
Read this file before making broad changes, then keep changes small and testable.

## System Context

- Backend data source is moving toward PostgreSQL as the single source of truth.
- The scraper project already migrated report storage to PostgreSQL and is removing Oracle ATP / ORDS.
- Scraper URLs and secrets must not be committed. Treat broker/source URLs, tokens, VPN hostnames, and generated env files as sensitive.
- The frontend should prefer a thin API client layer over ad hoc `fetch` calls inside components.
- Avoid large component rewrites unless a smaller pure-function extraction would not solve the issue.

Useful upstream references:

- `/home/ubuntu/prod/ssh-reports-scraper/docs/architecture.md`
- `/home/ubuntu/prod/ssh-reports-scraper/docs/changelog.md`

## Current Frontend Notes

- API base URL normalization lives in `src/utils/api.js`.
- Report pagination/fetch/merge logic currently lives mostly in `src/hooks/useReportFetch.js`.
- Search state is shared across `Header`, `SearchOverlay`, URL search params, and `ReportContext`.
- `HamburgerMenu` currently owns menu UI, Telegram auth, and keyword sync behavior.
- React `StrictMode` can cause development-only duplicate effects, so tests should not blindly assert "fetch called once" unless the hook intentionally guarantees that behavior.

## Near-Term TODO

1. Add focused tests for `src/utils/api.js`.
   - Normalize trailing slashes.
   - Upgrade non-local `http` API origins to `https`.
   - Preserve localhost `http`.
   - Fall back to the default API URL on invalid input.

2. Extract report URL building from `useReportFetch`.
   - Create a pure function such as `buildReportsUrl`.
   - Keep `/reports/` canonical unless the backend contract changes.
   - Test `offset`, `limit`, `mkt_tp`, `sort`, and `q` query parameters.

3. Extract report normalization/merge helpers.
   - Handle uppercase and lowercase backend fields.
   - Preserve duplicate report-id de-duping.
   - Test both `sortBy: "time"` and `sortBy: "company"` output shapes.

4. Introduce a small API client wrapper.
   - Centralize JSON parsing and HTTP error handling.
   - Keep endpoint-specific trailing slash decisions in one place.
   - Move keyword/auth calls toward this wrapper after report URL tests exist.

5. Simplify search state.
   - Choose one source of truth for `q` and `category`.
   - Consider a hook such as `useReportSearchParams`.
   - Keep URL deep-link behavior intact.

6. Split `HamburgerMenu` only after the API layer is covered.
   - Candidate hooks: `useTelegramAuth`, `useKeywords`.
   - Keep the component mostly responsible for UI composition.

## Verification Policy

- Run `npm run lint` and `npm run build` after frontend changes when dependencies are installed.
- Add `vitest` before adding JavaScript unit tests.
- If local disk space is low, avoid full `npm install` until space is recovered.
- Prefer tests for pure helpers before hook/component tests.

