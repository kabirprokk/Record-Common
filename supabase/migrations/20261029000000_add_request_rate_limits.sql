create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table if not exists private.request_rate_limits (
  bucket_hash text primary key check (bucket_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create index if not exists request_rate_limits_window_started_idx
  on private.request_rate_limits (window_started_at);

alter table private.request_rate_limits enable row level security;
revoke all on private.request_rate_limits from public, anon, authenticated, service_role;

create or replace function public.consume_request_rate_limit(
  p_bucket_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_bucket_hash is null or p_limit is null or p_window_seconds is null
    or p_bucket_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1 or p_limit > 1000
    or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit request.';
  end if;

  insert into private.request_rate_limits as current_bucket (
    bucket_hash,
    window_started_at,
    request_count
  ) values (
    p_bucket_hash,
    v_now,
    1
  )
  on conflict (bucket_hash) do update set
    window_started_at = case
      when current_bucket.window_started_at + pg_catalog.make_interval(secs => p_window_seconds) <= v_now
        then v_now
      else current_bucket.window_started_at
    end,
    request_count = case
      when current_bucket.window_started_at + pg_catalog.make_interval(secs => p_window_seconds) <= v_now
        then 1
      else current_bucket.request_count + 1
    end
  returning request_count, window_started_at
    into v_request_count, v_window_started_at;

  with stale_buckets as (
    select bucket_hash
    from private.request_rate_limits
    where window_started_at < v_now - interval '2 days'
    order by window_started_at
    limit 100
  )
  delete from private.request_rate_limits as expired
  using stale_buckets
  where expired.bucket_hash = stale_buckets.bucket_hash;

  return query select
    v_request_count <= p_limit,
    greatest(
      1,
      ceil(extract(epoch from (
        v_window_started_at + pg_catalog.make_interval(secs => p_window_seconds) - v_now
      )))::integer
    );
end;
$$;

revoke all on function public.consume_request_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_request_rate_limit(text, integer, integer)
  to service_role;

create or replace function public.request_rate_limit_ready()
returns boolean
language sql
set search_path = ''
as $$
  select true;
$$;

revoke all on function public.request_rate_limit_ready() from public, anon, authenticated;
grant execute on function public.request_rate_limit_ready() to service_role;

notify pgrst, 'reload schema';
