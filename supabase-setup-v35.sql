create table if not exists public.casino_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.casino_profiles enable row level security;

drop policy if exists "Players read their own casino profile" on public.casino_profiles;
create policy "Players read their own casino profile"
on public.casino_profiles for select
using (auth.uid() = id);

drop policy if exists "Players create their own casino profile" on public.casino_profiles;
create policy "Players create their own casino profile"
on public.casino_profiles for insert
with check (auth.uid() = id);

drop policy if exists "Players update their own casino profile" on public.casino_profiles;
create policy "Players update their own casino profile"
on public.casino_profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);
