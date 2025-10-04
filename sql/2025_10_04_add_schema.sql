-- =========================================================
-- CORE SCHEMA + RLS + VIEWS + DEPT FIELDS + FALLBACK READY
-- =========================================================

create table if not exists public.events (
  id bigserial primary key,
  title text not null,
  description text,
  event_date timestamptz not null,
  location text,
  fee numeric default 0,
  image_url text,
  image_path text,
  registration_link text,
  delete_at timestamptz,
  -- Audience flags
  audience_type text default 'college' check (audience_type in ('college','department')),
  target_department text,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_target_department on public.events (target_department);

create table if not exists public.announcements (
  id bigserial primary key,
  title text not null,
  content text,
  created_at timestamptz not null default now()
);

create table if not exists public.winners (
  id bigserial primary key,
  event_id bigint references public.events(id) on delete cascade,
  winner_name text not null,
  winner_class text,
  winner_dept text,
  position text,
  image_url text,
  image_path text,
  delete_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id bigserial primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  student_email text not null,
  student_name text,
  student_class text,
  student_dept text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname='registrations_event_email_unique') then
    alter table public.registrations
      add constraint registrations_event_email_unique unique (event_id, student_email);
  end if;
end $$;

-- Enable RLS
alter table public.events enable row level security;
alter table public.winners enable row level security;
alter table public.announcements enable row level security;
alter table public.registrations enable row level security;

-- Drop old policies if re-running
drop policy if exists "public select events" on public.events;
drop policy if exists "auth write events" on public.events;
drop policy if exists "public select winners" on public.winners;
drop policy if exists "auth write winners" on public.winners;
drop policy if exists "public select announcements" on public.announcements;
drop policy if exists "auth write announcements" on public.announcements;
drop policy if exists "public insert registrations" on public.registrations;
drop policy if exists "auth select registrations" on public.registrations;
drop policy if exists "auth delete registrations" on public.registrations;

create policy "public select events" on public.events for select to public using (true);
create policy "auth write events"  on public.events for all to authenticated using (true) with check (true);

create policy "public select winners" on public.winners for select to public using (true);
create policy "auth write winners"  on public.winners for all to authenticated using (true) with check (true);

create policy "public select announcements" on public.announcements for select to public using (true);
create policy "auth write announcements"  on public.announcements for all to authenticated using (true) with check (true);

create policy "public insert registrations" on public.registrations for insert to public with check (true);
create policy "auth select registrations" on public.registrations for select to authenticated using (true);
create policy "auth delete registrations" on public.registrations for delete to authenticated using (true);

-- View: event_reg_counts (drop & recreate)
drop view if exists public.event_reg_counts;

create or replace view public.event_reg_counts as
select e.id as event_id,
       e.title,
       count(r.id)::bigint as reg_count
from public.events e
left join public.registrations r on r.event_id = e.id
group by e.id, e.title;

grant select on public.event_reg_counts to anon, authenticated;

-- RPC for registrations by email
create or replace function public.get_registrations_by_email(p_email text)
returns table (
  id bigint,
  event_id bigint,
  student_email text,
  student_name text,
  student_class text,
  student_dept text,
  created_at timestamptz,
  title text,
  event_date timestamptz,
  location text
)
language sql
security definer
set search_path = public
as $$
  select
    r.id, r.event_id, r.student_email, r.student_name, r.student_class, r.student_dept, r.created_at,
    e.title, e.event_date, e.location
  from public.registrations r
  join public.events e on e.id = r.event_id
  where r.student_email = p_email
  order by r.created_at desc;
$$;

grant execute on function public.get_registrations_by_email(text) to anon, authenticated;

-- Storage buckets
do $$
begin
  insert into storage.buckets (id, name, public) values ('event-images','event-images', true)
  on conflict (id) do nothing;
  insert into storage.buckets (id, name, public) values ('winner','winner', true)
  on conflict (id) do nothing;
end $$;

-- Storage policies (reset)
drop policy if exists "public read event images" on storage.objects;
drop policy if exists "auth write event images" on storage.objects;
drop policy if exists "public read winner images" on storage.objects;
drop policy if exists "auth write winner images" on storage.objects;

create policy "public read event images" on storage.objects
  for select to public using (bucket_id='event-images');

create policy "auth write event images" on storage.objects
  for all to authenticated
  using (bucket_id='event-images')
  with check (bucket_id='event-images');

create policy "public read winner images" on storage.objects
  for select to public using (bucket_id='winner');

create policy "auth write winner images" on storage.objects
  for all to authenticated
  using (bucket_id='winner')
  with check (bucket_id='winner');