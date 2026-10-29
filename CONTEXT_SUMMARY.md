# Record Commons — project context

Record Commons is a moderated public archive for community-submitted videos.
Cloudinary hosts uploads, Supabase stores submission metadata, and only approved
records appear publicly.

## Current state

- Repository: https://github.com/kabirprokk/Record-Common
- Production: https://reccommons.vercel.app (free Vercel domain retained)
- Latest pushed code commit: `4725ded` (`fix: preserve Cloudinary upload public ID`).
- The user applied the video archive and request rate-limit migrations in
  Supabase project `abhadrizpkreyxijkscv`.
- Production rate-limit code is deployed; upload authorization, submissions,
  and moderator sign-in use Supabase-backed limits. Turnstile is not used.
- Cloudinary upload proof mismatch was fixed by removing the duplicated
  `folder` parameter while preserving the full pending path in `public_id`.
- User confirmed a fresh video submission completed and now appears in review.
- Moderator access currently uses server-side `ADMIN_PASSWORD` and a signed,
  HTTP-only session cookie. The password is stored as a sensitive Vercel
  environment variable, not exposed in public config or client code. Review API
  routes check the session.
- The change removes the public footer link to “Review desk” and
  expose its password-protected dialog at `/review`. No email or Google sign-in
  is being added. User wants the moderator option hidden and the password kept
  private.
- Local verification passed: TypeScript, lint, all 5 tests, production build,
  and SIGHT checks of `/` and `/review`. SIGHT confirmed the public footer has
  no review link and `/review` opens the password prompt.
- The hidden-review change is pushed as `9bd9949`. Vercel deployment for that
  commit was still `BUILDING` at last check; production homepage still showed
  the old footer link and `/review` returned 404 then.

## Next steps

1. Confirm Vercel deployment is ready and verify `/review` is live while the
   public homepage no longer shows the review link.
2. User can visit `https://reccommons.vercel.app/review` and enter the existing
   moderator password to review and approve submissions.

Keep server-only keys out of source control and chat. Hiding the link is only a
UI choice; the password/session checks on the review APIs remain the security
boundary.
