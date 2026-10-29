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
- User now reports Cloudinary `Invalid Signature` for a request using preset
  `ml_default`; the prior “Upload preset not found” has advanced to signature
  validation. Cloudinary env-var names exist in Vercel Production, but values
  were not decrypted. `cloudinarySignature` uses sorted upload parameters plus
  API secret with SHA-1, matching Cloudinary's documented signing scheme. Most
  likely issue is a cloud/API key/secret pair from different product
  environments or an outdated secret in Vercel.
- User reports changing the Cloudinary secret and redeploying; latest Vercel
  production deployment is currently `BUILDING`. Production `/api/config` still
  returns `uploadsEnabled: true` but does not validate Cloudinary credentials.
- Diagnosed the repeated “Upload authorization expired” rejection: upload
  signing sent both `folder=open-record/pending` and a `public_id` already
  containing `open-record/pending/`. Cloudinary can prepend the folder again in
  legacy folder mode, so its returned `public_id` does not match the proof.
  Local fix removes the separate `folder` parameter from the signed request and
  browser upload; only the path-qualified `public_id` remains. Build, lint,
  TypeScript, and tests pass. The fix has not yet been pushed or deployed.

## Next steps

1. Commit and push the Cloudinary public-ID fix, then verify Vercel production
   readiness.
2. Have the user retry with a fresh upload; verify submission, moderation, and
   public listing end to end.
3. Resume the requested simpler contributor-first redesign after the upload
   flow works.

Keep server-only keys out of source control and chat. Anonymous uploads remain
susceptible to distributed abuse; rate limits do not replace provider usage
alerts or moderation.
