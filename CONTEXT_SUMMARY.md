# Record Commons — project context

Record Commons is a moderated public archive. Cloudinary stores uploaded videos,
Supabase stores submission metadata, and only approved records appear publicly.

## Current state

- Repository: https://github.com/kabirprokk/Record-Common
- Production: https://reccommons.vercel.app
- Latest pushed commit before current UI/privacy hardening: `ae0231e` (`feat: encrypt moderator session cookies`).
- Moderator `/review` access is password/session protected and no longer linked
  from the public footer.
- User priorities: protect contributor identities as much as practical, improve
  archive availability, keep the ordinary website, and never remove existing
  posted videos.
- The application now fails closed for new uploads until `UPLOAD_RELAY_URL` is
  configured. The upload-sign route cannot issue direct-to-Cloudinary URLs, and
  public config reports uploads disabled without the relay.
- New uploads include the signed Cloudinary `fl_force_strip` incoming
  transformation to remove embedded global metadata (including GPS tags) before
  the asset is stored. Visual/audio clues and some stream-level fields can
  remain. Existing uploaded assets have not been changed or removed.
- The upload client replaces the contributor's original filename with a
  generic `record-video` filename (preserving only an allowlisted extension).
- The public videos API uses an explicit response allowlist and exposes only the
  UTC archive year, not the exact submission timestamp, to reduce timing-based
  correlation. Moderator review retains the exact timestamp privately.
- Submission UI explicitly lists the fields that become public after approval
  and requires contributors to acknowledge that before submitting.
- Submission UI also requires a separate review acknowledgment for potential
  identifying details in faces, voices, screens, documents, and locations. This
  is a user prompt, not automated media scanning.
- Moderator session cookies now encrypt the role/expiry payload with
  AES-256-GCM and a key derived from the high-entropy `SESSION_SECRET`. The
  cookie is opaque and authenticated; deploying this invalidates existing
  moderator sessions. This does not encrypt database rows or video files.
- The contribution dialog now presents a compact privacy summary that separates
  metadata reduction from network traceability limits and public disclosure.
  Site-wide typography uses one system sans-serif stack for a more minimal UI.
- The relay source is `workers/upload-relay/worker.mjs`; it is not deployed yet.
  When configured, Cloudinary sees the Worker egress IP, but Cloudflare and
  Vercel can still see visitor network metadata. Uploaded files may also contain
  identifying metadata. No Tor-style anonymity is claimed.
- Independent media/database backups are not configured. Cloudflare account,
  R2 bucket, deployment access, and restore checks are not available in this
  workspace.
- No existing database rows, Cloudinary assets, or migrations were changed.

## Verification completed locally

- `npx tsc --noEmit`, `npm run lint`, `npm test` (25 tests), and `npm run build`
  passed after the latest dialog/font changes. SIGHT confirmed system-ui
  typography at desktop and mobile widths; the contribution dialog itself was
  not opened in the visual browser check.
- SIGHT inspected the redesigned desktop and mobile layouts.
- Local production response returned HTTP 200 with CSP, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy: no-referrer`, and `Permissions-Policy`.
- Cloudinary demo requests returned HTTP 200 for both a generated JPG poster and
  a transformed MP4. This verifies Cloudinary URL behavior, not a live archive
  video.
- Vercel deployment for implementation commit `23a445b` and docs commit
  `d6df7dd` are both READY. Production homepage now serves the redesign, and
  `/review` returns HTTP 200. Production response has the configured CSP,
  `no-referrer`, `X-Content-Type-Options`, and other security headers.
- Production `/api/config` previously returned uploads enabled with
  `uploadRelayEnabled: false`. After this change deploys, uploads will remain
  disabled until the Worker and Vercel `UPLOAD_RELAY_URL` are configured.
- Production approved video poster URL returned HTTP 200 `image/jpeg`; derived
  playback URL returned HTTP 200 `video/mp4`. SIGHT confirmed the live archive
  card and thumbnail-bearing video element render.

## Next steps

1. Deploy `workers/upload-relay/worker.mjs` with `CLOUDINARY_CLOUD_NAME` and
   `ALLOWED_ORIGIN=https://reccommons.vercel.app`; set Vercel's
   `UPLOAD_RELAY_URL` to the Worker `/upload` URL and redeploy.
2. Configure independent R2/database backups and test a restore before claiming
   high availability.
3. Verify a small upload and a multi-chunk
   upload, review login, and archive playback after deployment.

Do not expose secrets in source or chat. The relay does not need the Cloudinary
API secret. A privacy relay shifts which provider sees the upload IP; it does
not make a contributor untraceable.
