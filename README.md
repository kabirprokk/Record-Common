# Record Commons

Record Commons is a moderated public index for videos submitted by anonymous
contributors. The site uploads video directly from the visitor's browser to
Cloudinary and stores metadata in Supabase. New entries stay out of the public
index until the archive moderator approves them.

## What works in this starter

- Public list of approved video records, with search.
- Anonymous video submissions with title, context, optional source link, and
  topics.
- Browser-to-Cloudinary upload, so video bytes do not pass through the app
  server.
- Turnstile verification before upload authorization.
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

The application does not establish that a video was censored, blocked, or
removed by any particular party. Moderators should check context, rights, and
privacy before approval, and respond to removal requests.

## Configure the services

The upload and review flows remain disabled until all required settings are
present. Copy `.env.example` to `.env.local` and fill in the values below.

1. Create a Supabase project. Apply
   `supabase/migrations/20260801000000_create_video_submissions.sql` using the
   Supabase SQL editor or the Supabase CLI.
2. Copy the project URL, publishable/anon key, and server-only `service_role`
   key into the matching environment variables. Keep the service-role key on
   the server; never add a `NEXT_PUBLIC_` prefix to it.
3. Create a Cloudinary account and set `CLOUDINARY_CLOUD_NAME`,
   `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and
   `CLOUDINARY_UPLOAD_PRESET`. Create a **signed** video upload preset in
   Cloudinary, restrict it to approved video formats, and set its maximum file
   size to the smaller of 100 MB or your account's supported maximum. The app
   signs the preset and upload parameters on the server and sends the file
   directly from the browser to Cloudinary.
4. Create a Cloudflare Turnstile widget for the site domain and set both the
   public site key and server secret key. The same verified challenge authorizes
   one upload. The resulting proof expires after one hour and is tied to the
   server-generated asset ID.
5. Set a unique `ADMIN_PASSWORD` and a cryptographically random
   `SESSION_SECRET` of at least 32 characters. The moderator password is not a
   contributor account; contributors never need to sign in.
6. Set `NEXT_PUBLIC_CONTACT_EMAIL` to a monitored address for rights, removal,
   and safety requests.
7. Configure these environment variables in the hosting platform, then deploy.

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
npm run build
```

## Review submissions

Open the **Review desk** link in the page footer and enter `ADMIN_PASSWORD`.
The signed moderator cookie is HTTP-only, same-site, and expires after eight
hours. Pending records can be played in the review desk and approved or
rejected. Only approved records appear in the public index. Rejected uploads
remain on the Cloudinary account until the moderator deletes them there.

## Data and privacy

The archive does not ask contributors for names, email addresses, or accounts.
Cloudinary and the application host may process network and upload metadata
under their own privacy policies. Turnstile may process request data to verify
visitors. The starter does not record submitter IP addresses in the database.

Anonymous uploads can still be abused. Turnstile is required for upload
authorization and moderator sign-in, but it is not a complete abuse-prevention
or content-moderation system. Review submissions before publication and monitor
provider usage. Add a distributed rate limiter and a clear takedown process
before promoting the site broadly.
