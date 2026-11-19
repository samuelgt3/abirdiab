# ADR 0002 — Supabase directly from the browser; no custom backend

- **Status:** accepted · **Date:** 2026-11-14 (database chosen in an earlier session)

## Context
Small content site, one editor, cPanel-style hosting (no Node server). Needs a database, a login for the admin, and file uploads.

## Decision
Use Supabase (PostgreSQL + Auth + Storage). The browser queries the REST API with the public anon key. Authorization is **row level
security** in Postgres. The admin is a route in the same React app. No custom API server.

## Consequences
+ Nothing to host or patch; free tier is enough; one deploy artifact (static files).
+ Content edits need no redeploy.
− Security lives entirely in SQL policies — they must be reviewed (see [SECURITY.md](../SECURITY.md)); baseline lets any signed-in user write.
− Anything needing a secret (payments, signed video URLs, email) must go into **Supabase Edge Functions**, not the front end.
− Free projects pause after inactivity and have no automatic backups.
Alternatives considered: Strapi/Directus (needs a Node host), a headless CMS (extra cost, no relational control), Firebase (no SQL).
