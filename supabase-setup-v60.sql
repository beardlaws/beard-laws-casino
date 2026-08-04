-- Beard Laws Casino V60 public player records. Run once in Supabase SQL Editor.
create table if not exists public.casino_public_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 24),
  casino_level integer not null default 1, total_spins bigint not null default 0,
  total_bonuses bigint not null default 0, biggest_multiplier numeric(12,2) not null default 0,
  biggest_win_units bigint not null default 0, favorite_game text not null default 'none',
  achievement_count integer not null default 0, updated_at timestamptz not null default now()
);
alter table public.casino_public_stats enable row level security;
drop policy if exists "Public stats are readable" on public.casino_public_stats;
create policy "Public stats are readable" on public.casino_public_stats for select using (true);
revoke insert, update, delete on public.casino_public_stats from anon, authenticated;

create or replace function public.publish_casino_stats(
  p_display_name text, p_total_spins bigint, p_total_bonuses bigint,
  p_biggest_multiplier numeric, p_biggest_win_units bigint, p_xp bigint,
  p_favorite_game text, p_achievement_count integer
) returns void language plpgsql security definer set search_path=public as $$
declare old public.casino_public_stats%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into old from public.casino_public_stats where user_id=auth.uid();
  if old.user_id is not null and (p_total_spins < old.total_spins or p_total_spins > old.total_spins + 5000) then raise exception 'Invalid progression'; end if;
  insert into public.casino_public_stats values (
    auth.uid(), left(regexp_replace(trim(p_display_name),'[^a-zA-Z0-9 _-]','','g'),24),
    greatest(1,least(99,1+floor(sqrt(greatest(0,p_xp))/25)::int)), greatest(0,p_total_spins),
    greatest(0,p_total_bonuses), greatest(0,p_biggest_multiplier), greatest(0,p_biggest_win_units),
    left(p_favorite_game,30), greatest(0,p_achievement_count), now())
  on conflict(user_id) do update set display_name=excluded.display_name,
    casino_level=greatest(casino_public_stats.casino_level,excluded.casino_level),
    total_spins=greatest(casino_public_stats.total_spins,excluded.total_spins),
    total_bonuses=greatest(casino_public_stats.total_bonuses,excluded.total_bonuses),
    biggest_multiplier=greatest(casino_public_stats.biggest_multiplier,excluded.biggest_multiplier),
    biggest_win_units=greatest(casino_public_stats.biggest_win_units,excluded.biggest_win_units),
    favorite_game=excluded.favorite_game,achievement_count=greatest(casino_public_stats.achievement_count,excluded.achievement_count),updated_at=now();
end $$;
revoke all on function public.publish_casino_stats from public;
grant execute on function public.publish_casino_stats to authenticated;
create or replace view public.casino_public_leaderboard with (security_invoker=true) as
select display_name,casino_level,total_spins,total_bonuses,biggest_multiplier,biggest_win_units,
favorite_game,achievement_count,updated_at from public.casino_public_stats;
grant select on public.casino_public_leaderboard to anon,authenticated;
