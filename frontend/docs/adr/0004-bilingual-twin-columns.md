# ADR 0004 — Arabic as twin columns (`title` / `title_ar`)

- **Status:** accepted · **Date:** 2026-11-14 (schema existed from the earlier session)

## Context
Exactly two languages, both needed side by side for one editor who is not technical.

## Decision
Every translatable field has an `_ar` sibling on the same row. The admin shows the two columns side by side; the site falls back to
English when the Arabic value is empty.

## Consequences
+ Simplest possible data model and admin form; one query per table; no joins.
− A third language means a schema change; at that point move to a `translations(table, row_id, lang, field, value)` table or `jsonb` per field.
− Rows can be left half-translated; the fallback hides that on the site, so review in the admin.
