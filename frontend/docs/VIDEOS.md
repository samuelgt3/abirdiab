# Course videos

## Decision so far (not final)
Host course videos on **Bunny Stream**, not on the web host and not in Supabase Storage. See [ADR 0005](adr/0005-video-hosting-bunny.md).

Reasoning from the previous session: students may re-watch lessons many times. Cloudflare Stream bills per *minute watched*
(about $1 per 1 000 minutes), Bunny bills per GB delivered, and its "Volume network" tier (listed on Bunny's pricing page at about
$0.005/GB) may be much cheaper.

**Still to confirm with Bunny support** (the client was told to ask):
1. Can **Stream** use the Volume tier, or only the standard CDN tier?
2. How fast is delivery in Egypt / the Gulf?
3. What is the real monthly cost for the expected audience?

Do not sign a plan before these are answered.

## What exists in the code
- `courses.video_id` — the Bunny video GUID, editable in the admin.
- `VITE_BUNNY_LIBRARY_ID` — the library number.
- For items marked **free**, the course detail view embeds `https://iframe.mediadelivery.net/embed/<library>/<video_id>`.
- Paid videos are **not** embedded: serving them safely needs the account system in [ROADMAP.md](ROADMAP.md).

## Setting up Bunny (when decided)
1. Create a Stream **library**; note the library ID.
2. Upload the video; copy its **Video ID** (a GUID) into the course in `/admin`.
3. Library → Security: add the site's domain under **Allowed referrers** (blocks embedding elsewhere), and enable MP4 fallback only if downloads are wanted.
4. Put the library ID in `.env.local` / the build environment as `VITE_BUNNY_LIBRARY_ID`.

## Paid videos (future)
Referrer restriction alone is not enough: anyone who finds the embed URL can share it. For paid lessons use **token authentication**
(signed, expiring URLs). The signing key must live on a server — a Supabase **Edge Function** that checks the buyer's purchase and
returns a signed embed URL. Never put the Bunny security key in front-end code.

## Audio meditations and PDFs
Small enough for the Supabase `media` bucket (the free plan has storage and bandwidth caps — check the current limits on Supabase's pricing page and watch usage). Free downloads use `file_url`.
Paid audio/PDF have the same "anyone with the URL" problem as paid video; use signed Storage URLs from an Edge Function once payments exist.
