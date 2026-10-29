# Record Commons

Record Commons is a moderated public index for videos submitted without account
registration. Uploads remain disabled until the required relay is configured;
then video bytes pass through the relay before reaching Cloudinary. Submission
metadata is stored in Supabase. New entries stay out of the public index until
the archive moderator approves them.

## What works in this starter

- Public list of approved video records, with search.
- Video submissions with title, context, optional source link, and topics.
- Video uploads routed through the required Cloudflare Worker relay.
- Cloudinary-generated poster thumbnails and playback derivatives for archive
  entries.
- Supabase-backed rate limits for upload authorization, submissions, and
  moderator sign-in.
- A moderator password and signed, HTTP-only session cookie.
- A private review queue with approve and reject actions.
- Supabase row-level security that limits public reads to approved records;
  writes go through server routes after validation.

## Before deploying

This is an MVP, not a guarantee of permanent, cost-free video hosting. The
Cloudinary free plan, upload quotas, media delivery, retention, and content rules
can change. Review the provider's current plan and terms, set account usage
alerts or limits where available, and test the expected video formats and
maximum file size before accepting public submissions. The app caps each video
at 100 MB, but the provider may set a lower ceiling.

Cloudinary uploads use public delivery URLs. A pending upload is hidden from the
archive, but it is not private: anyone who obtains its direct URL may be able to
view it. Contributors see this warning before uploading. Do not accept videos
containing private or sensitive material. The site does not yet delete rejected
assets from Cloudinary automatically; remove them from the provider dashboard.

The Cloudflare Worker in `workers/upload-relay/worker.mjs` relays video chunks to
Cloudinary. The application disables uploads until `UPLOAD_RELAY_URL` is
configured and never falls back to direct browser-to-Cloudinary uploads.
Cloudinary receives the relay's IP instead of the contributor's. Cloudflare
still receives the contributor's connection, and Vercel still receives requests
for the site and upload authorization. Video files may also contain identifying
metadata. This reduces one provider's view of the contributor; it does not
provide Tor-style anonymity or protect against traffic correlation.

The application does not establish that a video was censored, blocked, or
removed by any particular party. Moderators should check context, rights, and
privacy before approval, and respond to removal requests.

## Configure the services

The upload and review flows remain disabled until all required settings are
present. Copy `.env.example` to `.env.local` and fill in the values below.

1. Create a Supabase project. Apply
   `supabase/migrations/20260801000000_create_video_submissions.sql` and
   `supabase/migrations/20261029000000_add_request_rate_limits.sql` using the
   Supabase SQL editor or the Supabase CLI.
2. Copy the project URL, publishable/anon key, and server-only `service_role`
   key into the matching environment variables. Keep the service-role key on
   the server; never add a `NEXT_PUBLIC_` prefix to it.
3. Create a Cloudinary account and set `CLOUDINARY_CLOUD_NAME`,
   `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and
   `CLOUDINARY_UPLOAD_PRESET`. Create a **signed** video upload preset in
   Cloudinary, restrict it to approved video formats, and set its maximum file
   size to the smaller of 100 MB or your account's supported maximum. The app
   signs the preset and upload parameters on the server. Uploads remain disabled
   until the required relay is configured.
4. Set a unique `ADMIN_PASSWORD` and a cryptographically random
   `SESSION_SECRET` of at least 32 characters. The moderator password is not a
   contributor account; contributors never need to sign in.
5. Set `NEXT_PUBLIC_CONTACT_EMAIL` to a monitored address for rights, removal,
    and safety requests.
6. Configure these environment variables in the hosting platform, then deploy.

Deploy `workers/upload-relay/worker.mjs` as a Cloudflare Worker. Set its
`CLOUDINARY_CLOUD_NAME` and `ALLOWED_ORIGIN` variables, with `ALLOWED_ORIGIN` set
to the exact public site origin. Configure `UPLOAD_RELAY_URL` in Vercel as the
Worker URL ending in `/upload`, then redeploy the site. The relay does not need
the Cloudinary API secret. Uploads stay disabled until this setup is complete.

The server enforces these per-address limits: five upload authorizations per
15 minutes, ten per day, five completed-submission requests per hour, and five
moderator sign-in attempts per 15 minutes. These limits deter repeated requests
from one network address, but do not stop coordinated traffic from many
addresses or replace provider-level usage controls.

Do not commit `.env.local` or paste secrets into browser-visible settings.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Run the checks before deployment:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

## Review submissions

Open `https://your-site.example/review` and enter `ADMIN_PASSWORD`. The review
route is intentionally not linked from the public page.
The signed moderator cookie is HTTP-only, same-site, and expires after eight
hours. Pending records can be played in the review desk and approved or
rejected. Only approved records appear in the public index. Rejected uploads
remain on the Cloudinary account until the moderator deletes them there.

## Data and privacy

The archive does not ask contributors for names, email addresses, or accounts.
Cloudinary and the application host may process network and upload metadata
under their own privacy policies. Rate-limit identifiers are HMAC-hashed with
`SESSION_SECRET`; raw IP addresses are not stored in the rate-limit table.

Independent media and database backups are not configured by this repository.
Cloudinary and Supabase remain separate primary providers, but provider outages
or account loss could still make records unavailable. Configure an independent
backup target and test restoration before treating the archive as highly
available. Public playback URLs use generated Cloudinary derivatives; this does
not overwrite or delete the stored original assets or database records.

Anonymous uploads can still be abused, including by attackers using many
different network addresses. Supabase-backed limits reduce repeated requests
from one address but do not replace Cloudinary usage alerts, moderator review, or
a clear takedown process.
