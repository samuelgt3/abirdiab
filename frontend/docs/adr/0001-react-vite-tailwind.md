# ADR 0001 — React + Vite + Tailwind instead of the custom HTML bundle

- **Status:** accepted · **Date:** 2026-11-14

## Context
The site came out of Claude Design as `Abir Diab Site.dc.html` (a custom `<x-dc>` template framework) and a 3 MB self-unpacking
"bundled" HTML file. It cannot be edited with normal tools, has no build step, tests or version-friendly structure, and had to be regenerated
for every deploy. The client asked for a conventional stack (React, Tailwind).

## Decision
A Vite-built React 18 single-page app with Tailwind CSS 3, React Router, ESLint and Vitest. Fonts self-hosted via `@fontsource`.

## Consequences
+ Normal developer workflow, small bundle (≈150 kB gzip JS, admin split out), CI-friendly, easy for any React developer to take over.
+ Admin and site share components, tokens and the Supabase client.
− The original markup was rebuilt by hand; small visual differences from the Design export are possible. Brand tokens were copied exactly.
− Client-side rendering: SEO relies on Google's renderer; pre-rendering is on the roadmap.
- Tailwind 3 chosen over 4 for stability of tooling.
