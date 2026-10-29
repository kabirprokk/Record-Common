# Record Commons — project context

Record Commons is a moderated public archive. Cloudinary stores uploaded videos,
Supabase stores submission metadata, and only approved records appear publicly.

## Current state

- Repository: https://github.com/kabirprokk/Record-Common
- Production: https://reccommons.vercel.app
- Latest pushed code commit: `23a445b` (`feat: redesign archive and add privacy relay`).
- Moderator `/review` access is password/session protected and no longer linked
  from the public footer.
- User priorities: protect contributor identities as much as practical, improve
  archive availability, keep the ordinary website, and never remove existing
  posted videos.
- Commit `23a445b` contains the complete homepage and
  responsive UI redesign; Cloudinary-generated video poster thumbnails;
  `q_auto` derived playback URLs without database/media mutation; restrictive
  security headers; clearer upload privacy disclosure; optional chunked upload
  relay source in `workers/upload-relay/worker.mjs`; and relay URL configuration.
- Upload relay is not deployed. Without Vercel `UPLOAD_RELAY_URL`, uploads still
  go directly from visitor browsers to Cloudinary. Once configured, Cloudinary
  sees the Worker egress IP, but Cloudflare and Vercel can still see visitor
  network metadata. No Tor-style anonymity is claimed.
- Independent media/database backups are not configured. Cloudflare account,
  R2 bucket, deployment access, and restore checks are not available in this
  workspace.
- No existing database rows, Cloudinary assets, or migrations were changed.

## Verification completed locally

- `npx tsc --noEmit`, `npm run lint`, `npm test` (13 tests),
  `node --check workers/upload-relay/worker.mjs`, and `npm run build` passed.
- SIGHT inspected the redesigned desktop and mobile layouts.
- Local production response returned HTTP 200 with CSP, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy: no-referrer`, and `Permissions-Policy`.
- Cloudinary demo requests returned HTTP 200 for both a generated JPG poster and
  a transformed MP4. This verifies Cloudinary URL behavior, not a live archive
  video.
- Vercel deployment for `23a445b` was `BUILDING` at last check. The current
  production home had not yet updated. `/review` returned HTTP 200. Production
  config has uploads enabled; the previous deployment does not expose relay
  status, so direct Cloudinary upload is still active until the new code deploys
  and `UPLOAD_RELAY_URL` is set.

## Next steps

1. Confirm Vercel deployment `23a445b` is ready, then verify the new UI,
   thumbnails, and security headers in production.
2. Deploy `workers/upload-relay/worker.mjs` with `CLOUDINARY_CLOUD_NAME` and
   `ALLOWED_ORIGIN=https://reccommons.vercel.app`; set Vercel's
   `UPLOAD_RELAY_URL` to the Worker `/upload` URL and redeploy.
3. Configure independent R2/database backups and test a restore before claiming
   high availability.
4. Verify production headers, poster rendering, a small upload, a multi-chunk
   upload, review login, and archive playback after deployment.

Do not expose secrets in source or chat. The relay does not need the Cloudinary
API secret. A privacy relay shifts which provider sees the upload IP; it does
not make a contributor untraceable.
