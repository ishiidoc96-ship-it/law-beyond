-- ============================================
-- PUSH SUBSCRIPTIONS TABLE
-- ============================================
create table public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
create table public.notifications (
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

create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "System can insert notifications"
  on public.notifications for insert
  with check (true);

-- ============================================
-- INDEXES
-- ============================================
create index idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
create index idx_push_subscriptions_endpoint on public.push_subscriptions(endpoint);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_read on public.notifications(user_id, read);
create index idx_notifications_created_at on public.notifications(created_at desc);

-- ============================================
-- FUNCTION: Send notification on streak_like
-- ============================================
create or replace function public.handle_streak_like_notification()
returns trigger as $$
declare
  post_owner uuid;
  actor_name text;
begin
  -- Get post owner
  select user_id into post_owner
  from public.streak_posts
  where id = new.post_id;

  -- Don't notify yourself
  if post_owner = new.user_id then
    return new;
  end if;

  -- Get actor name
  select full_name into actor_name
  from public.profiles
  where id = new.user_id;

  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (
    post_owner,
    'streak_like',
    'New like',
    coalesce(actor_name, 'Someone') || ' liked your streak post',
    '/streaks',
    new.user_id
  );

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_streak_like_notification
  after insert on public.streak_likes
  for each row execute function public.handle_streak_like_notification();

-- ============================================
-- FUNCTION: Send notification on streak_comment
-- ============================================
create or replace function public.handle_streak_comment_notification()
returns trigger as $$
declare
  post_owner uuid;
  actor_name text;
begin
  select user_id into post_owner
  from public.streak_posts
  where id = new.post_id;

  if post_owner = new.user_id then
    return new;
  end if;

  select full_name into actor_name
  from public.profiles
  where id = new.user_id;

  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (
    post_owner,
    'streak_comment',
    'New comment',
    coalesce(actor_name, 'Someone') || ' commented on your streak post',
    '/streaks',
    new.user_id
  );

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_streak_comment_notification
  after insert on public.streak_comments
  for each row execute function public.handle_streak_comment_notification();

-- ============================================
-- FUNCTION: Notify on new streak post (friends only)
-- ============================================
create or replace function public.handle_streak_post_notification()
returns trigger as $$
declare
  actor_name text;
  friend record;
begin
  select full_name into actor_name
  from public.profiles
  where id = new.user_id;

  -- Only notify friends (not all users)
  for friend in
    select case
      when f.user_id_1 = new.user_id then f.user_id_2
      else f.user_id_1
    end as friend_id
    from public.friends f
    where f.user_id_1 = new.user_id or f.user_id_2 = new.user_id
  loop
    insert into public.notifications (user_id, type, title, body, link, actor_id)
    values (
      friend.friend_id,
      'streak_post',
      'New streak post',
      coalesce(actor_name, 'Someone') || ' posted a new streak update',
      '/streaks',
      new.user_id
    );
  end loop;

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_streak_post_broadcast_notification
  after insert on public.streak_posts
  for each row execute function public.handle_streak_post_notification();

-- ============================================
-- EDGE FUNCTION: Send push notifications
-- ============================================
-- This is handled by the Supabase Edge Function (see supabase/functions/send-push/)
-- The function reads push_subscriptions and sends web-push messages
