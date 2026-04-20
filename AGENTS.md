# Agent Notes

Before making broad changes, read `docs/ai-handoff.md` and `docs/portfolio-roadmap.md`.

Keep changes small and prefer this order:

1. Pure helper tests.
2. API/report URL builder extraction.
3. Report normalization and merge helper extraction.
4. API client wrapper.
5. Search state cleanup.
6. Hamburger menu/auth/keyword hook split.

Do not commit secrets, generated env files, local AI state, build output, or dependency directories.
