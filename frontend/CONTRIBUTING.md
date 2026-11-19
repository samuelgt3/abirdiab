# Contributing

## Workflow
1. Branch from `main`: `feature/<short-name>` or `fix/<short-name>`.
2. Make the change. Keep it small and focused.
3. Run `npm run check` (lint + tests + build). It must pass.
4. Open a pull request; CI repeats the check. Describe *what* and *why*, and how you tested it (browser + language + screen size).
5. Squash-merge. Use clear commit messages in the imperative mood: `Hide past workshops on the site`.

## Conventions
- **React**: function components and hooks, one component per file in `src/components`, PascalCase file names. Shared state only through `SiteContext`.
- **Styling**: Tailwind utilities. Brand colours/fonts come from `tailwind.config.js` — do not hard-code hex values in components. Reusable patterns go in `@layer components` in `index.css`.
- **RTL**: logical properties only (`ms/me/ps/pe/start/end`); see [docs/I18N.md](docs/I18N.md). Test every UI change in English **and** Arabic and at 375 px.
- **Text**: user-visible strings go in `src/content/*.json` (both languages), never inline. Business content belongs in the database.
- **Data**: never query Supabase from a component — go through `lib/content.js` or the admin modules. Never use or request the `service_role` key.
- **Database changes**: add a new numbered file in `supabase/migrations/` (never edit an applied one), make it re-runnable, update [docs/DATABASE.md](docs/DATABASE.md) and `src/data/fallback.json`/`seed.sql` if the shape changes.
- **Logic goes in pure functions** (`lib/`, `admin/payload.js`) so it can be unit-tested.
- **Do not change the design** (layout, colours, copy) without the client's approval.
- No secrets in the repo. `.env.local` is git-ignored.

## Definition of done
- [ ] `npm run check` passes
- [ ] Works in EN and AR, desktop and mobile, with the database **and** with the fallback content
- [ ] Docs updated (README / docs / CHANGELOG / HANDOFF if state changed)
- [ ] New logic has a test

## Adding an editable field (example)
1. Migration: `alter table courses add column level text;`
2. `src/admin/schema.js`: add `{ key: 'level', label: 'Level', type: 'text' }` to `courses.fields`.
3. Show it in `Courses.jsx`.
4. Add it to `fallback.json` / `seed.sql` if it should have a starter value.
