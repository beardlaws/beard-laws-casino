-- Beard Laws Casino V33 cloud profiles. Run once in Supabase SQL Editor.
create table if not exists public.casino_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.casino_profiles enable row level security;

drop policy if exists "Players read their casino profile" on public.casino_profiles;
create policy "Players read their casino profile" on public.casino_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "Players create their casino profile" on public.casino_profiles;
create policy "Players create their casino profile" on public.casino_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "Players update their casino profile" on public.casino_profiles;
create policy "Players update their casino profile" on public.casino_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
