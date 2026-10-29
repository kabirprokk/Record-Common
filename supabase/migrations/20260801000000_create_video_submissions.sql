create table if not exists public.video_submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 1200),
  media_url text not null check (media_url like 'https://res.cloudinary.com/%'),
  public_id text not null unique,
  source_url text check (source_url is null or (char_length(source_url) <= 500 and source_url like 'https://%')),
  tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rights_confirmed boolean not null default false check (rights_confirmed),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists video_submissions_public_feed_idx
  on public.video_submissions (created_at desc)
  where status = 'approved';

create index if not exists video_submissions_review_queue_idx
  on public.video_submissions (created_at asc)
  where status = 'pending';

alter table public.video_submissions enable row level security;

revoke all on public.video_submissions from anon, authenticated;
grant select on public.video_submissions to anon;
grant all on public.video_submissions to service_role;

drop policy if exists "Public can read approved records" on public.video_submissions;
create policy "Public can read approved records"
  on public.video_submissions
  for select
  to anon
  using (status = 'approved');

drop policy if exists "Public can submit pending records" on public.video_submissions;
