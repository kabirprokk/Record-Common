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
- Supabase REST responds, but `public.video_submissions` is not created yet
  (`PGRST205`). The correct migration is
  `supabase/migrations/20260801000000_create_video_submissions.sql`.
- Supabase Data API uses opaque `sb_publishable_*` / `sb_secret_*` values as
  `apikey`; `src/lib/server.ts` now avoids sending these keys as bearer JWTs,
  while preserving bearer headers for legacy JWT-form keys.
- Latest deployment for commit `b91cf5a` is `READY`; the production page and
  `/record-commons-mark.svg` return HTTP 200, and the page includes the new mark.
- Production `/api/config` reports `archiveEnabled: true`, `uploadsEnabled:
  false`; `/api/videos` still returns 503 because the archive table is missing.

## Required user setup

1. In the Supabase dashboard for project `abhadrizpkreyxijkscv`, open SQL
   Editor and run the migration above. Do not use the unrelated Supabase MCP
   database connection.
2. In Vercel project `reccommons`, add server-only `SUPABASE_SERVICE_ROLE_KEY`
   (Supabase secret key) and the Cloudinary credentials/preset, Turnstile
   secret/site key, `ADMIN_PASSWORD`, and `SESSION_SECRET`. Never ask for these
   secret values in chat.
3. Redeploy if needed, then verify submission → moderator review → public list.

The public publishable key is not a secret, but do not put server-only keys in
client code or Git. Current local `.env.local` and `.vercel/` remain ignored.
