# Record Commons — project context

Record Commons is a moderated public archive for community-submitted videos.
Cloudinary hosts uploads, Supabase stores submission metadata, and only approved
records appear publicly.

## Current state

- Repository: https://github.com/kabirprokk/Record-Common
- Production: https://reccommons.vercel.app (free Vercel domain retained)
- Latest published code commit: `fa2bca7`.
- Logo is live at `/record-commons-mark.svg` and used in the header, footer, and
  browser icon.
- The user applied
  `supabase/migrations/20260801000000_create_video_submissions.sql`; verified
  that the table exists and production `/api/videos` returns HTTP 200 with `[]`.
- Vercel `reccommons` Production now contains the Supabase server key, Cloudinary
  settings, `ADMIN_PASSWORD`, and `SESSION_SECRET` as sensitive variables. Their
  values were not retrieved or printed. Turnstile variables are absent by user
  preference.
- Production still runs the prior code until the no-Turnstile change is pushed.
- Work in progress: remove Turnstile; add Supabase-backed atomic rate limiting
  for upload signing (5 per 15 minutes, 10 per day), submissions (5 per hour),
  and moderator sign-in (5 per 15 minutes). Rate-limit subjects use HMAC hashes
  of Vercel-forwarded IP values; raw IPs are not stored. Enforcement fails
  closed if Supabase rate-limit RPCs are unavailable.
- New migration pending: `supabase/migrations/20261029000000_add_request_rate_limits.sql`.
  Production config will keep uploads disabled until this migration is applied.

## Next steps

1. Finish and verify the implementation with TypeScript, lint, tests, and build.
2. Have the user apply the new rate-limit migration in the SQL Editor for
   Supabase project `abhadrizpkreyxijkscv`; do not use the unrelated MCP database.
3. Push the code, wait for Vercel production deployment, and verify the rate
   limit readiness check, upload signing, submission, moderator review, and
   public listing.

Keep server-only keys out of source control and chat. Anonymous uploads remain
susceptible to distributed abuse; rate limits do not replace provider usage
alerts or moderation.
