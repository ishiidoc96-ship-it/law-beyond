-- ============================================
-- STREAK V2 MIGRATION
-- Adds: freeze, restore, milestones, calendar
-- Run this ONCE on your Supabase project
-- ============================================

-- ============================================
-- 1. ALTER USER_STREAKS TABLE
-- ============================================
-- Add freeze and restore columns
alter table public.user_streaks
  add column if not exists freeze_available integer default 1 not null,
  add column if not exists freezes_used integer default 0 not null,
  add column if not exists last_freeze_used_at timestamp with time zone,
  add column if not exists streak_started_at date default current_date,
  add column if not exists today_posted boolean default false not null;

-- ============================================
-- 2. STREAK FREEZES TABLE (audit log)
-- ============================================
create table if not exists public.streak_freezes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  frozen_at timestamp with time zone default timezone('utc'::text, now()) not null,
  streak_at_freeze integer not null,
  reason text default 'manual' not null
);

alter table public.streak_freezes enable row level security;

create policy "Users can view own freezes"
  on public.streak_freezes for select
  using (auth.uid() = user_id);

create policy "System can insert freezes"
  on public.streak_freezes for insert
  with check (true);

-- ============================================
-- 3. STREAK RESTORES TABLE (audit log)
-- ============================================
create table if not exists public.streak_restores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  restored_at timestamp with time zone default timezone('utc'::text, now()) not null,
  streak_restored_to integer not null,
  days_lost integer not null
);

alter table public.streak_restores enable row level security;

create policy "Users can view own restores"
  on public.streak_restores for select
  using (auth.uid() = user_id);

create policy "System can insert restores"
  on public.streak_restores for insert
  with check (true);

-- ============================================
-- 4. STREAK ACHIEVEMENTS TABLE
-- ============================================
create table if not exists public.streak_achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  achievement_type text not null,
  unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
  streak_count integer not null,
  unique(user_id, achievement_type)
);

alter table public.streak_achievements enable row level security;

create policy "Anyone can view achievements"
  on public.streak_achievements for select
  using (true);

create policy "System can insert achievements"
  on public.streak_achievements for insert
  with check (true);

-- ============================================
-- 5. INDEXES FOR NEW TABLES
-- ============================================
create index if not exists idx_streak_freezes_user_id on public.streak_freezes(user_id);
create index if not exists idx_streak_restores_user_id on public.streak_restores(user_id);
create index if not exists idx_streak_achievements_user_id on public.streak_achievements(user_id);
create index if not exists idx_streak_achievements_type on public.streak_achievements(achievement_type);
create index if not exists idx_user_streaks_today_posted on public.user_streaks(today_posted);

-- ============================================
-- 6. REPLACE TRIGGER: handle_streak_post_v2
-- ============================================
-- Drop old trigger first
drop trigger if exists on_streak_post_created on public.streak_posts;

-- Replace function with V2
create or replace function public.handle_streak_post_v2()
returns trigger as $$
declare
  streak_record record;
  days_since_last_post integer;
  was_broken boolean := false;
  old_streak integer := 0;
begin
  -- Upsert streak record
  insert into public.user_streaks (user_id, current_streak, longest_streak, last_post_date, today_posted, streak_started_at)
  values (new.user_id, 1, 1, new.post_date, true, new.post_date)
  on conflict (user_id) do update set
    today_posted = true,
    updated_at = timezone('utc'::text, now());

  select * into streak_record
  from public.user_streaks
  where user_id = new.user_id;

  if streak_record.last_post_date is null then
    -- First post ever
    update public.user_streaks
    set current_streak = 1,
        longest_streak = greatest(longest_streak, 1),
        last_post_date = new.post_date,
        streak_started_at = new.post_date,
        today_posted = true,
        updated_at = timezone('utc'::text, now())
    where user_id = new.user_id;
  else
    days_since_last_post := new.post_date - streak_record.last_post_date;

    if days_since_last_post = 1 then
      -- Consecutive day - extend streak
      update public.user_streaks
      set current_streak = current_streak + 1,
          longest_streak = greatest(longest_streak, current_streak + 1),
          last_post_date = new.post_date,
          today_posted = true,
          updated_at = timezone('utc'::text, now())
      where user_id = new.user_id;

      -- Check for milestone achievements
      if (streak_record.current_streak + 1) in (3, 7, 14, 30, 50, 100, 200, 365) then
        insert into public.streak_achievements (user_id, achievement_type, streak_count)
        values (new.user_id, 'streak_' || (streak_record.current_streak + 1), streak_record.current_streak + 1)
        on conflict (user_id, achievement_type) do nothing;
      end if;

    elsif days_since_last_post = 0 then
      -- Same day - no change to streak
      update public.user_streaks
      set last_post_date = new.post_date,
          today_posted = true,
          updated_at = timezone('utc'::text, now())
      where user_id = new.user_id;
    else
      -- Gap detected - check if freeze was applied
      if days_since_last_post = 2 and streak_record.freeze_available > 0 then
        -- Auto-freeze: save old streak for audit
        old_streak := streak_record.current_streak;

        -- Consume one freeze
        update public.user_streaks
        set freeze_available = freeze_available - 1,
            freezes_used = freezes_used + 1,
            last_freeze_used_at = timezone('utc'::text, now()),
            last_post_date = new.post_date,
            today_posted = true,
            updated_at = timezone('utc'::text, now())
        where user_id = new.user_id;

        -- Log the freeze
        insert into public.streak_freezes (user_id, streak_at_freeze, reason)
        values (new.user_id, old_streak, 'auto_applied');
      else
        -- Streak broken - restart (no freeze available or gap > 2)
        was_broken := true;
        update public.user_streaks
        set current_streak = 1,
            last_post_date = new.post_date,
            today_posted = true,
            streak_started_at = new.post_date,
            updated_at = timezone('utc'::text, now())
        where user_id = new.user_id;
      end if;
    end if;
  end if;

  -- Refresh freeze availability weekly (every Monday)
  if extract(dow from timezone('utc'::text, now())) = 1 then
    update public.user_streaks
    set freeze_available = 1
    where user_id = new.user_id
      and freeze_available < 1;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Create new trigger
create trigger on_streak_post_created
  after insert on public.streak_posts
  for each row execute function public.handle_streak_post_v2();

-- ============================================
-- 7. FUNCTION: use_streak_freeze (manual freeze)
-- ============================================
create or replace function public.use_streak_freeze(p_user_id uuid)
returns json as $$
declare
  streak_record record;
  new_freezes integer;
begin
  select * into streak_record
  from public.user_streaks
  where user_id = p_user_id;

  if not found then
    return json_build_object('success', false, 'error', 'No streak record found');
  end if;

  if streak_record.freeze_available <= 0 then
    return json_build_object('success', false, 'error', 'No freeze available');
  end if;

  if streak_record.current_streak = 0 then
    return json_build_object('success', false, 'error', 'No active streak to freeze');
  end if;

  -- Apply freeze
  update public.user_streaks
  set freeze_available = freeze_available - 1,
      freezes_used = freezes_used + 1,
      last_freeze_used_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  where user_id = p_user_id;

  -- Log it
  insert into public.streak_freezes (user_id, streak_at_freeze, reason)
  values (p_user_id, streak_record.current_streak, 'manual');

  new_freezes := streak_record.freeze_available - 1;

  return json_build_object(
    'success', true,
    'freeze_available', new_freezes,
    'streak', streak_record.current_streak
  );
end;
$$ language plpgsql security definer;

-- ============================================
-- 8. FUNCTION: restore_streak (bring back broken streak)
-- ============================================
create or replace function public.restore_streak(p_user_id uuid)
returns json as $$
declare
  streak_record record;
  last_achievement record;
  days_since_break integer;
  restored_streak integer;
begin
  select * into streak_record
  from public.user_streaks
  where user_id = p_user_id;

  if not found then
    return json_build_object('success', false, 'error', 'No streak record found');
  end if;

  if streak_record.current_streak > 1 then
    return json_build_object('success', false, 'error', 'Streak is not broken');
  end if;

  -- Find the streak at time of break (from achievements or frozen state)
  -- For simplicity, restore to streak_started_at based calculation
  days_since_break := current_date - streak_record.last_post_date;

  if days_since_break > 3 then
    return json_build_object('success', false, 'error', 'Too late to restore (max 3 days)');
  end if;

  -- Find the longest streak before the break to guess what to restore
  restored_streak := streak_record.longest_streak;

  -- Restore: set streak back to 1 (the post today counts)
  -- The user pays 100 points or watches an ad in real app
  -- For testing, we just restore
  update public.user_streaks
  set current_streak = restored_streak,
      last_post_date = current_date,
      today_posted = true,
      updated_at = timezone('utc'::text, now())
  where user_id = p_user_id;

  -- Log it
  insert into public.streak_restores (user_id, streak_restored_to, days_lost)
  values (p_user_id, restored_streak, days_since_break);

  return json_build_object(
    'success', true,
    'restored_streak', restored_streak,
    'days_lost', days_since_break
  );
end;
$$ language plpgsql security definer;

-- ============================================
-- 9. FUNCTION: get_streak_calendar
-- ============================================
create or replace function public.get_streak_calendar(
  p_user_id uuid,
  p_year integer default extract(year from current_date)::integer,
  p_month integer default extract(month from current_date)::integer
)
returns json as $$
declare
  posted_dates date[];
  result json;
begin
  -- Get all post dates for the given month
  select array_agg(distinct post_date order by post_date) into posted_dates
  from public.streak_posts
  where user_id = p_user_id
    and extract(year from post_date) = p_year
    and extract(month from post_date) = p_month;

  result := json_build_object(
    'year', p_year,
    'month', p_month,
    'posted_dates', coalesce(posted_dates, '{}'),
    'total_posts', coalesce(array_length(posted_dates, 1), 0)
  );

  return result;
end;
$$ language plpgsql security definer;

-- ============================================
-- 10. FUNCTION: reset_today_posted (run daily)
-- ============================================
create or replace function public.reset_today_posted()
returns void as $$
begin
  update public.user_streaks
  set today_posted = false
  where today_posted = true;
end;
$$ language plpgsql security definer;

-- ============================================
-- 11. SEED ACHIEVEMENT DEFINITIONS
-- ============================================
-- These are defined as milestones in the app code, not in DB
-- But we can create a reference view for display purposes
create or replace view public.streak_milestone_definitions as
select * from (values
  (3, 'first_steps', 'First Steps', 'Maintained a 3-day streak', 'local_fire_department', '🔥'),
  (7, 'one_week', 'One Week Warrior', 'Maintained a 7-day streak', 'stars', '⭐'),
  (14, 'two_weeks', 'Fortnight Fighter', 'Maintained a 14-day streak', 'military_tech', '🎖️'),
  (30, 'monthly_master', 'Monthly Master', 'Maintained a 30-day streak', 'trophy', '🏆'),
  (50, 'fifty火焰', 'Half Century', 'Maintained a 50-day streak', 'diamond', '💎'),
  (100, 'centurion', 'Centurion', 'Maintained a 100-day streak', 'emoji_events', '💯'),
  (200, 'legend', 'Legend', 'Maintained a 200-day streak', 'shield', '🛡️'),
  (365, 'year_champion', 'Year Champion', 'Maintained a 365-day streak', 'workspace_premium', '👑')
) as t(streak_count, achievement_type, title, description, icon, emoji);
