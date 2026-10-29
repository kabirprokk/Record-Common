# Record Commons — project context

Record Commons is a moderated public archive for community-submitted videos.
Cloudinary hosts uploads, Supabase stores submission metadata, and only approved
records appear publicly.

## Current state

- Repository: https://github.com/kabirprokk/Record-Common
- Production: https://reccommons.vercel.app (free Vercel domain retained)
- Branch `main` includes logo commit `b91cf5a` (`feat: add Record Commons logo`).
- New mark: `public/record-commons-mark.svg`, used in the header, footer, and
  browser icon. The SVG is valid and has been visually checked.
- Latest code changes pass `npx tsc --noEmit`, `npm run lint`, and
  `npm run build`.
- Supabase URL and publishable key are stored as encrypted Vercel env vars for
  production, preview, and development. No secret key is set.
- The user applied `supabase/migrations/20260801000000_create_video_submissions.sql`.
  Verified Supabase REST returns HTTP 200 and `[]` for
  `video_submissions?select=id&limit=0` (table exists and is empty).
- Supabase Data API uses opaque `sb_publishable_*` / `sb_secret_*` values as
  `apikey`; `src/lib/server.ts` now avoids sending these keys as bearer JWTs,
  while preserving bearer headers for legacy JWT-form keys.
- Latest deployment for commit `b91cf5a` is `READY`; the production page and
  `/record-commons-mark.svg` return HTTP 200, and the page includes the new mark.
- Production `/api/config` reports `archiveEnabled: true`, `uploadsEnabled:
  false`; `/api/videos` now returns HTTP 200 with `[]` (table exists, no
  approved records yet).

## Required user setup

1. In Vercel project `reccommons`, add server-only `SUPABASE_SERVICE_ROLE_KEY`
   (Supabase secret key) and the Cloudinary credentials/preset, Turnstile
   secret/site key, `ADMIN_PASSWORD`, and `SESSION_SECRET`. Never ask for these
   secret values in chat.
2. Redeploy if needed, then verify submission → moderator review → public list.

The public publishable key is not a secret, but do not put server-only keys in
client code or Git. Current local `.env.local` and `.vercel/` remain ignored.
