-- ============================================
-- FUTURE LAWYER — COMPLETE DATABASE SCHEMA
-- Run this ONE file in Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS)
-- ============================================

-- ============================================
-- PROFILES
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  avatar_url text,
  university text,
  course text,
  year_of_study text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- TASKS
-- ============================================
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  due_date timestamp with time zone,
  priority text check (priority in ('high', 'medium', 'low')) default 'medium',
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;
drop policy if exists "Users can CRUD own tasks" on public.tasks;
create policy "Users can CRUD own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- HABITS
-- ============================================
create table if not exists public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  category text,
  icon text default 'check_circle',
  target_per_day integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.habits enable row level security;
drop policy if exists "Users can CRUD own habits" on public.habits;
create policy "Users can CRUD own habits"
  on public.habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- HABIT COMPLETIONS
-- ============================================
create table if not exists public.habit_completions (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  completed_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(habit_id, completed_date)
);

alter table public.habit_completions enable row level security;
drop policy if exists "Users can CRUD own habit completions" on public.habit_completions;
create policy "Users can CRUD own habit completions"
  on public.habit_completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- JOURNAL ENTRIES
-- ============================================
create table if not exists public.journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  mood text,
  prompt text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.journal_entries enable row level security;
drop policy if exists "Users can CRUD own journal entries" on public.journal_entries;
create policy "Users can CRUD own journal entries"
  on public.journal_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- TRANSACTIONS
-- ============================================
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  amount decimal(10,2) not null,
  type text check (type in ('income', 'expense')) not null,
  category text,
  transaction_date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.transactions enable row level security;
drop policy if exists "Users can CRUD own transactions" on public.transactions;
create policy "Users can CRUD own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- ASSIGNMENTS
-- ============================================
create table if not exists public.assignments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  subject text,
  description text,
  due_date timestamp with time zone,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.assignments enable row level security;
drop policy if exists "Users can CRUD own assignments" on public.assignments;
create policy "Users can CRUD own assignments"
  on public.assignments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- STREAK POSTS
-- ============================================
create table if not exists public.streak_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  media_url text not null,
  media_type text check (media_type in ('image', 'video')) default 'image' not null,
  caption text,
  post_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.streak_posts enable row level security;

drop policy if exists "Anyone can view streak posts" on public.streak_posts;
create policy "Anyone can view streak posts"
  on public.streak_posts for select
  using (true);

drop policy if exists "Users can insert own streak posts" on public.streak_posts;
create policy "Users can insert own streak posts"
  on public.streak_posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own streak posts" on public.streak_posts;
create policy "Users can delete own streak posts"
  on public.streak_posts for delete
  using (auth.uid() = user_id);

-- ============================================
-- STREAK LIKES
-- ============================================
create table if not exists public.streak_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.streak_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

alter table public.streak_likes enable row level security;

drop policy if exists "Anyone can view streak likes" on public.streak_likes;
create policy "Anyone can view streak likes"
  on public.streak_likes for select
  using (true);

drop policy if exists "Users can like posts" on public.streak_likes;
create policy "Users can like posts"
  on public.streak_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can unlike posts" on public.streak_likes;
create policy "Users can unlike posts"
  on public.streak_likes for delete
  using (auth.uid() = user_id);

-- ============================================
-- STREAK COMMENTS
-- ============================================
create table if not exists public.streak_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.streak_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.streak_comments enable row level security;

drop policy if exists "Anyone can view streak comments" on public.streak_comments;
create policy "Anyone can view streak comments"
  on public.streak_comments for select
  using (true);

drop policy if exists "Users can add comments" on public.streak_comments;
create policy "Users can add comments"
  on public.streak_comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.streak_comments;
create policy "Users can delete own comments"
  on public.streak_comments for delete
  using (auth.uid() = user_id);

-- ============================================
-- USER STREAKS (with V2 columns)
-- ============================================
create table if not exists public.user_streaks (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  current_streak integer default 0 not null,
  longest_streak integer default 0 not null,
  last_post_date date,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  freeze_available integer default 1 not null,
  freezes_used integer default 0 not null,
  last_freeze_used_at timestamp with time zone,
  streak_started_at date default current_date,
  today_posted boolean default false not null
);

alter table public.user_streaks enable row level security;

drop policy if exists "Anyone can view user streaks" on public.user_streaks;
create policy "Anyone can view user streaks"
  on public.user_streaks for select
  using (true);

drop policy if exists "Users can update own streak" on public.user_streaks;
create policy "Users can update own streak"
  on public.user_streaks for update
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own streak" on public.user_streaks;
create policy "Users can insert own streak"
  on public.user_streaks for insert
  with check (auth.uid() = user_id);

-- ============================================
-- STREAK FREEZES (V2)
-- ============================================
create table if not exists public.streak_freezes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  frozen_at timestamp with time zone default timezone('utc'::text, now()) not null,
  streak_at_freeze integer not null,
  reason text default 'manual' not null
);

alter table public.streak_freezes enable row level security;
drop policy if exists "Users can view own freezes" on public.streak_freezes;
create policy "Users can view own freezes" on public.streak_freezes for select using (auth.uid() = user_id);
drop policy if exists "System can insert freezes" on public.streak_freezes;
create policy "System can insert freezes" on public.streak_freezes for insert with check (true);

-- ============================================
-- STREAK RESTORES (V2)
-- ============================================
create table if not exists public.streak_restores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  restored_at timestamp with time zone default timezone('utc'::text, now()) not null,
  streak_restored_to integer not null,
  days_lost integer not null
);

alter table public.streak_restores enable row level security;
drop policy if exists "Users can view own restores" on public.streak_restores;
create policy "Users can view own restores" on public.streak_restores for select using (auth.uid() = user_id);
drop policy if exists "System can insert restores" on public.streak_restores;
create policy "System can insert restores" on public.streak_restores for insert with check (true);

-- ============================================
-- STREAK ACHIEVEMENTS (V2)
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
drop policy if exists "Anyone can view achievements" on public.streak_achievements;
create policy "Anyone can view achievements" on public.streak_achievements for select using (true);
drop policy if exists "System can insert achievements" on public.streak_achievements;
create policy "System can insert achievements" on public.streak_achievements for insert with check (true);

-- ============================================
-- FRIEND REQUESTS
-- ============================================
create table if not exists public.friend_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(sender_id, receiver_id)
);

alter table public.friend_requests enable row level security;

drop policy if exists "Users can view own friend requests" on public.friend_requests;
create policy "Users can view own friend requests"
  on public.friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can send friend requests" on public.friend_requests;
create policy "Users can send friend requests"
  on public.friend_requests for insert
  with check (auth.uid() = sender_id);

drop policy if exists "Users can update own friend requests" on public.friend_requests;
create policy "Users can update own friend requests"
  on public.friend_requests for update
  using (auth.uid() = receiver_id);

drop policy if exists "Users can delete own friend requests" on public.friend_requests;
create policy "Users can delete own friend requests"
  on public.friend_requests for delete
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- ============================================
-- FRIENDS
-- ============================================
create table if not exists public.friends (
  id uuid default gen_random_uuid() primary key,
  user_id_1 uuid references public.profiles(id) on delete cascade not null,
  user_id_2 uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id_1, user_id_2),
  check (user_id_1 < user_id_2)
);

alter table public.friends enable row level security;

drop policy if exists "Users can view own friendships" on public.friends;
create policy "Users can view own friendships"
  on public.friends for select
  using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

drop policy if exists "System can insert friendships" on public.friends;
create policy "System can insert friendships"
  on public.friends for insert
  with check (true);

drop policy if exists "Users can delete own friendships" on public.friends;
create policy "Users can delete own friendships"
  on public.friends for delete
  using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- ============================================
-- PUSH SUBSCRIPTIONS
-- ============================================
create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;
drop policy if exists "Users can manage own push subscriptions" on public.push_subscriptions;
create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text not null,
  link text,
  actor_id uuid references public.profiles(id) on delete set null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

drop policy if exists "System can insert notifications" on public.notifications;
create policy "System can insert notifications"
  on public.notifications for insert
  with check (true);

-- ============================================
-- ALL INDEXES
-- ============================================
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_habits_user_id on public.habits(user_id);
create index if not exists idx_habit_completions_habit_id on public.habit_completions(habit_id);
create index if not exists idx_habit_completions_date on public.habit_completions(completed_date);
create index if not exists idx_journal_entries_user_id on public.journal_entries(user_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_assignments_user_id on public.assignments(user_id);
create index if not exists idx_streak_posts_user_id on public.streak_posts(user_id);
create index if not exists idx_streak_posts_post_date on public.streak_posts(post_date desc);
create index if not exists idx_streak_likes_post_id on public.streak_likes(post_id);
create index if not exists idx_streak_likes_user_id on public.streak_likes(user_id);
create index if not exists idx_streak_comments_post_id on public.streak_comments(post_id);
create index if not exists idx_streak_comments_user_id on public.streak_comments(user_id);
create index if not exists idx_user_streaks_user_id on public.user_streaks(user_id);
create index if not exists idx_streak_freezes_user_id on public.streak_freezes(user_id);
create index if not exists idx_streak_restores_user_id on public.streak_restores(user_id);
create index if not exists idx_streak_achievements_user_id on public.streak_achievements(user_id);
create index if not exists idx_streak_achievements_type on public.streak_achievements(achievement_type);
create index if not exists idx_user_streaks_today_posted on public.user_streaks(today_posted);
create index if not exists idx_friend_requests_sender on public.friend_requests(sender_id);
create index if not exists idx_friend_requests_receiver on public.friend_requests(receiver_id);
create index if not exists idx_friend_requests_status on public.friend_requests(status);
create index if not exists idx_friends_user1 on public.friends(user_id_1);
create index if not exists idx_friends_user2 on public.friends(user_id_2);
create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions(endpoint);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(user_id, read);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

-- ============================================
-- STREAK TRIGGER V2 (with freeze + achievements)
-- ============================================
drop trigger if exists on_streak_post_created on public.streak_posts;

create or replace function public.handle_streak_post_v2()
returns trigger as $$
declare
  streak_record record;
  days_since_last_post integer;
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
      update public.user_streaks
      set current_streak = current_streak + 1,
          longest_streak = greatest(longest_streak, current_streak + 1),
          last_post_date = new.post_date,
          today_posted = true,
          updated_at = timezone('utc'::text, now())
      where user_id = new.user_id;

      -- Check milestones
      if (streak_record.current_streak + 1) in (3, 7, 14, 30, 50, 100, 200, 365) then
        insert into public.streak_achievements (user_id, achievement_type, streak_count)
        values (new.user_id, 'streak_' || (streak_record.current_streak + 1), streak_record.current_streak + 1)
        on conflict (user_id, achievement_type) do nothing;
      end if;

    elsif days_since_last_post = 0 then
      update public.user_streaks
      set last_post_date = new.post_date,
          today_posted = true,
          updated_at = timezone('utc'::text, now())
      where user_id = new.user_id;
    else
      if days_since_last_post = 2 and streak_record.freeze_available > 0 then
        update public.user_streaks
        set freeze_available = freeze_available - 1,
            freezes_used = freezes_used + 1,
            last_freeze_used_at = timezone('utc'::text, now()),
            last_post_date = new.post_date,
            today_posted = true,
            updated_at = timezone('utc'::text, now())
        where user_id = new.user_id;

        insert into public.streak_freezes (user_id, streak_at_freeze, reason)
        values (new.user_id, streak_record.current_streak, 'auto_applied');
      else
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

  -- Refresh freeze weekly (Monday)
  if extract(dow from timezone('utc'::text, now())) = 1 then
    update public.user_streaks
    set freeze_available = 1
    where user_id = new.user_id and freeze_available < 1;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_streak_post_created
  after insert on public.streak_posts
  for each row execute function public.handle_streak_post_v2();

-- ============================================
-- NOTIFICATION TRIGGERS
-- ============================================

-- Streak like notification
create or replace function public.handle_streak_like_notification()
returns trigger as $$
declare
  post_owner uuid;
  actor_name text;
begin
  select user_id into post_owner from public.streak_posts where id = new.post_id;
  if post_owner = new.user_id then return new; end if;
  select full_name into actor_name from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (post_owner, 'streak_like', 'New like', coalesce(actor_name, 'Someone') || ' liked your streak post', '/streaks', new.user_id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_streak_like_notification on public.streak_likes;
create trigger on_streak_like_notification
  after insert on public.streak_likes
  for each row execute function public.handle_streak_like_notification();

-- Streak comment notification
create or replace function public.handle_streak_comment_notification()
returns trigger as $$
declare
  post_owner uuid;
  actor_name text;
begin
  select user_id into post_owner from public.streak_posts where id = new.post_id;
  if post_owner = new.user_id then return new; end if;
  select full_name into actor_name from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (post_owner, 'streak_comment', 'New comment', coalesce(actor_name, 'Someone') || ' commented on your streak post', '/streaks', new.user_id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_streak_comment_notification on public.streak_comments;
create trigger on_streak_comment_notification
  after insert on public.streak_comments
  for each row execute function public.handle_streak_comment_notification();

-- Streak post notification (friends only)
create or replace function public.handle_streak_post_notification()
returns trigger as $$
declare
  actor_name text;
  friend record;
begin
  select full_name into actor_name from public.profiles where id = new.user_id;
  for friend in
    select case when f.user_id_1 = new.user_id then f.user_id_2 else f.user_id_1 end as friend_id
    from public.friends f
    where f.user_id_1 = new.user_id or f.user_id_2 = new.user_id
  loop
    insert into public.notifications (user_id, type, title, body, link, actor_id)
    values (friend.friend_id, 'streak_post', 'New streak post', coalesce(actor_name, 'Someone') || ' posted a new streak update', '/streaks', new.user_id);
  end loop;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_streak_post_broadcast_notification on public.streak_posts;
create trigger on_streak_post_broadcast_notification
  after insert on public.streak_posts
  for each row execute function public.handle_streak_post_notification();

-- ============================================
-- FRIENDS RPC FUNCTIONS
-- ============================================

-- Send friend request
create or replace function public.send_friend_request(p_receiver_id uuid)
returns json as $$
declare
  sender_id uuid;
  existing_record record;
begin
  sender_id := auth.uid();
  if sender_id = p_receiver_id then
    return json_build_object('success', false, 'error', 'Cannot send request to yourself');
  end if;

  if exists (
    select 1 from public.friends
    where (user_id_1 = sender_id and user_id_2 = p_receiver_id)
       or (user_id_1 = p_receiver_id and user_id_2 = sender_id)
  ) then
    return json_build_object('success', false, 'error', 'Already friends');
  end if;

  select * into existing_record
  from public.friend_requests
  where ((sender_id = p_receiver_id and receiver_id = sender_id)
      or (sender_id = sender_id and receiver_id = p_receiver_id));

  if found then
    if existing_record.status = 'pending' and existing_record.sender_id = sender_id then
      return json_build_object('success', false, 'error', 'Request already sent');
    elsif existing_record.status = 'pending' and existing_record.receiver_id = sender_id then
      update public.friend_requests set status = 'accepted', updated_at = now() where id = existing_record.id;
      insert into public.friends (user_id_1, user_id_2)
      values (least(sender_id, p_receiver_id), greatest(sender_id, p_receiver_id)) on conflict do nothing;
      return json_build_object('success', true, 'action', 'auto_accepted');
    end if;
  end if;

  insert into public.friend_requests (sender_id, receiver_id) values (sender_id, p_receiver_id)
  on conflict do update set status = 'pending', updated_at = now();

  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (p_receiver_id, 'friend_request', 'Friend request',
    coalesce((select full_name from public.profiles where id = sender_id), 'Someone') || ' sent you a friend request',
    '/streaks', sender_id);

  return json_build_object('success', true, 'action', 'request_sent');
end;
$$ language plpgsql security definer;

-- Respond to friend request
create or replace function public.respond_friend_request(p_request_id uuid, p_accept boolean)
returns json as $$
declare
  request_record record;
  sender uuid;
  receiver uuid;
begin
  receiver := auth.uid();
  select * into request_record
  from public.friend_requests
  where id = p_request_id and receiver_id = receiver and status = 'pending';

  if not found then
    return json_build_object('success', false, 'error', 'Request not found');
  end if;

  sender := request_record.sender_id;

  if p_accept then
    update public.friend_requests set status = 'accepted', updated_at = now() where id = p_request_id;
    insert into public.friends (user_id_1, user_id_2)
    values (least(sender, receiver), greatest(sender, receiver)) on conflict do nothing;

    insert into public.notifications (user_id, type, title, body, link, actor_id)
    values (sender, 'friend_accepted', 'Friend request accepted',
      coalesce((select full_name from public.profiles where id = receiver), 'Someone') || ' accepted your friend request',
      '/streaks', receiver);

    return json_build_object('success', true, 'action', 'accepted');
  else
    update public.friend_requests set status = 'rejected', updated_at = now() where id = p_request_id;
    return json_build_object('success', true, 'action', 'rejected');
  end if;
end;
$$ language plpgsql security definer;

-- Remove friend
create or replace function public.remove_friend(p_friend_id uuid)
returns json as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  delete from public.friends
  where (user_id_1 = least(current_user_id, p_friend_id) and user_id_2 = greatest(current_user_id, p_friend_id));
  return json_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Get friends
create or replace function public.get_friends(p_user_id uuid)
returns json as $$
declare
  result json;
begin
  select json_agg(json_build_object(
    'friend_id', case when f.user_id_1 = p_user_id then f.user_id_2 else f.user_id_1 end,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'friends_since', f.created_at
  ))
  into result
  from public.friends f
  join public.profiles p on p.id = case when f.user_id_1 = p_user_id then f.user_id_2 else f.user_id_1 end
  where f.user_id_1 = p_user_id or f.user_id_2 = p_user_id;

  return coalesce(result, '[]'::json);
end;
$$ language plpgsql security definer;

-- Search users (by name or email)
create or replace function public.search_users(p_query text, p_limit integer default 20)
returns json as $$
declare
  current_user_id uuid;
  result json;
begin
  current_user_id := auth.uid();
  select json_agg(json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'university', p.university
  ))
  into result
  from public.profiles p
  where p.id != current_user_id
    and (
      p.full_name ilike '%' || p_query || '%'
      or p.email ilike '%' || p_query || '%'
    )
  order by p.full_name
  limit p_limit;

  return coalesce(result, '[]'::json);
end;
$$ language plpgsql security definer;

-- ============================================
-- STREAK V2 RPC FUNCTIONS
-- ============================================

-- Use streak freeze
create or replace function public.use_streak_freeze(p_user_id uuid)
returns json as $$
declare
  streak_record record;
begin
  select * into streak_record from public.user_streaks where user_id = p_user_id;

  if not found then
    return json_build_object('success', false, 'error', 'No streak record found');
  end if;
  if streak_record.freeze_available <= 0 then
    return json_build_object('success', false, 'error', 'No freeze available');
  end if;
  if streak_record.current_streak = 0 then
    return json_build_object('success', false, 'error', 'No active streak to freeze');
  end if;

  update public.user_streaks
  set freeze_available = freeze_available - 1,
      freezes_used = freezes_used + 1,
      last_freeze_used_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  where user_id = p_user_id;

  insert into public.streak_freezes (user_id, streak_at_freeze, reason)
  values (p_user_id, streak_record.current_streak, 'manual');

  return json_build_object('success', true, 'freeze_available', streak_record.freeze_available - 1, 'streak', streak_record.current_streak);
end;
$$ language plpgsql security definer;

-- Restore streak
create or replace function public.restore_streak(p_user_id uuid)
returns json as $$
declare
  streak_record record;
  days_since_break integer;
  restored_streak integer;
begin
  select * into streak_record from public.user_streaks where user_id = p_user_id;

  if not found then return json_build_object('success', false, 'error', 'No streak record found'); end if;
  if streak_record.current_streak > 1 then return json_build_object('success', false, 'error', 'Streak is not broken'); end if;

  days_since_break := current_date - streak_record.last_post_date;
  if days_since_break > 3 then return json_build_object('success', false, 'error', 'Too late to restore (max 3 days)'); end if;

  restored_streak := streak_record.longest_streak;
  update public.user_streaks
  set current_streak = restored_streak, last_post_date = current_date, today_posted = true,
      updated_at = timezone('utc'::text, now())
  where user_id = p_user_id;

  insert into public.streak_restores (user_id, streak_restored_to, days_lost)
  values (p_user_id, restored_streak, days_since_break);

  return json_build_object('success', true, 'restored_streak', restored_streak, 'days_lost', days_since_break);
end;
$$ language plpgsql security definer;

-- Get streak calendar
create or replace function public.get_streak_calendar(
  p_user_id uuid,
  p_year integer default extract(year from current_date)::integer,
  p_month integer default extract(month from current_date)::integer
)
returns json as $$
declare
  posted_dates date[];
begin
  select array_agg(distinct post_date order by post_date) into posted_dates
  from public.streak_posts
  where user_id = p_user_id
    and extract(year from post_date) = p_year
    and extract(month from post_date) = p_month;

  return json_build_object(
    'year', p_year, 'month', p_month,
    'posted_dates', coalesce(posted_dates, '{}'),
    'total_posts', coalesce(array_length(posted_dates, 1), 0)
  );
end;
$$ language plpgsql security definer;

-- Suggested users: people with active streaks who aren't friends yet
create or replace function public.get_suggested_users(p_limit integer default 20)
returns json as $$
declare
  current_user_id uuid;
  result json;
begin
  current_user_id := auth.uid();
  select json_agg(json_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'university', p.university,
    'current_streak', coalesce(us.current_streak, 0)
  ))
  into result
  from public.profiles p
  left join public.user_streaks us on us.user_id = p.id
  where p.id != current_user_id
    and coalesce(us.current_streak, 0) > 0
    and p.id not in (
      select case when f.user_id_1 = current_user_id then f.user_id_2 else f.user_id_1 end
      from public.friends f
      where f.user_id_1 = current_user_id or f.user_id_2 = current_user_id
    )
  order by us.current_streak desc
  limit p_limit;

  return coalesce(result, '[]'::json);
end;
$$ language plpgsql security definer;

-- Get friend request status between two users
create or replace function public.get_friend_request_status(p_target_id uuid)
returns json as $$
declare
  current_user_id uuid;
  request record;
begin
  current_user_id := auth.uid();

  select * into request
  from public.friend_requests
  where (sender_id = current_user_id and receiver_id = p_target_id)
     or (sender_id = p_target_id and receiver_id = current_user_id)
  order by created_at desc
  limit 1;

  if not found then
    return json_build_object('status', 'none');
  end if;

  return json_build_object(
    'status', request.status,
    'is_sender', request.sender_id = current_user_id,
    'request_id', request.id
  );
end;
$$ language plpgsql security definer;

-- ============================================
-- DONE! All tables, triggers, and functions created.
-- ============================================
