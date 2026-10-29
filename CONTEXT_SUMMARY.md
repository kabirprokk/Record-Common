# Record Commons — project context

Record Commons is a moderated public archive for community-submitted videos.
Cloudinary hosts uploads, Supabase stores submission metadata, and only approved
records appear publicly.

## Current state

- Repository: https://github.com/kabirprokk/Record-Common
- Production: https://reccommons.vercel.app (free Vercel domain retained)
- Latest published code commit: `191f6bb` (`feat: replace Turnstile with Supabase rate limits`).
- Logo is live at `/record-commons-mark.svg` and used in the header, footer, and
  browser icon.
- The user applied
  `supabase/migrations/20260801000000_create_video_submissions.sql`; verified
  that the table exists and production `/api/videos` returns HTTP 200 with `[]`.
- Vercel `reccommons` Production now contains the Supabase server key, Cloudinary
  settings, `ADMIN_PASSWORD`, and `SESSION_SECRET` as sensitive variables. Their
  values were not retrieved or printed. Turnstile variables are absent by user
  preference.
- Vercel has started a production deployment for `191f6bb`; it was observed in
  `BUILDING` state. Confirm readiness and check `/api/config` before claiming
  the update is live.
- The code removes Turnstile and adds Supabase-backed atomic rate limiting
  for upload signing (5 per 15 minutes, 10 per day), submissions (5 per hour),
  and moderator sign-in (5 per 15 minutes). Rate-limit subjects use HMAC hashes
  of Vercel-forwarded IP values; raw IPs are not stored. Enforcement fails
  closed if Supabase rate-limit RPCs are unavailable.
- The user applied `supabase/migrations/20261029000000_add_request_rate_limits.sql`.
  Production config now reports `uploadsEnabled: true`; `/api/videos` returns
  HTTP 200 and an empty array. The deployment for `191f6bb` is READY.
- User reports Cloudinary returns “Upload preset not found.” Cloudinary env-var
  names exist in Vercel Production, but values were not decrypted. Likely
  configuration mismatch: exact preset name/cloud account/preset setup must be
  checked in Cloudinary.

## Next steps

1. Resolve the Cloudinary preset mismatch with the user; never decrypt or ask
   them to post the API secret.
2. Resume the requested simpler contributor-first redesign after the upload
   issue is resolved or scoped.
3. After UI changes, verify submission, moderation, and public listing end to
   end.

Keep server-only keys out of source control and chat. Anonymous uploads remain
susceptible to distributed abuse; rate limits do not replace provider usage
alerts or moderation.
