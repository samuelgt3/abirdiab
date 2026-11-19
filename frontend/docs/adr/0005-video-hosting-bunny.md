# ADR 0005 — Bunny Stream for course video

- **Status:** proposed — pending answers from Bunny support · **Date:** 2026-11-14 (decision from the earlier session)

## Context
Course videos are large, replayed often by students (≈10 views each), and part of them are paid. Hosting video on the cPanel host or in
Supabase Storage would be slow and quickly exceed bandwidth limits.

## Decision
Host on **Bunny Stream** and store only `courses.video_id`. Compared with Cloudflare Stream (billed per minute watched, ≈$1 / 1 000 min)
Bunny bills per GB delivered, which is expected to be cheaper for heavy re-watching.

## Open questions (do not commit money until answered)
1. Can Stream use Bunny's cheap "Volume" tier?  2. Delivery speed in Egypt / the Gulf?  3. Expected monthly cost.

## Consequences
+ Cheap, adaptive streaming, domain-restricted embeds, signed URLs available.
− Another vendor and bill. Paid-only playback needs a server-side signing step (Edge Function) — see [VIDEOS.md](../VIDEOS.md).
