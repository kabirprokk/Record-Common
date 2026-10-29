# Project context

Record Commons is a moderated video-submission archive. Contributors upload a
video from the site; Cloudinary hosts the file, Supabase stores its metadata,
and only moderator-approved entries appear in the public index.

## Current state

- Local project: this directory (`open-records-archive`).
- Vercel project: `reccommons` in team `kabirprokks-projects`.
- Production URL: https://reccommons.vercel.app
- Latest production deployment is ready, public, and returns HTTP 200.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass.
- Production `/api/config` currently reports `archiveEnabled: false` and
  `uploadsEnabled: false`.
- Vercel has no environment variables configured for this project.
- The available Supabase MCP is connected to an unrelated database with a
  `public.products` table. Do not apply the archive migration to that database.
- The intended migration is
  `supabase/migrations/20260801000000_create_video_submissions.sql`.

## External setup required

Before production submissions and review can work, configure the correct
Supabase project, Cloudinary signed video uploads, Cloudflare Turnstile,
`ADMIN_PASSWORD`, and `SESSION_SECRET`. Set values in Vercel project environment
settings; do not put secret values in source control or chat. Apply the migration
only to the new archive Supabase project, then redeploy and exercise submission,
moderation, and public listing end to end.

The free Vercel subdomain is intentional for now; no paid domain was purchased.
