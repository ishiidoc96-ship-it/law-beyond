-- Future Lawyer - Supabase Database Schema
-- Run this in the Supabase SQL Editor

-- ============================================
-- PROFILES TABLE
-- ============================================
create table public.profiles (
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

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

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

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- TASKS TABLE
-- ============================================
create table public.tasks (
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

create policy "Users can CRUD own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- HABITS TABLE
-- ============================================
create table public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  category text,
  icon text default 'check_circle',
  target_per_day integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.habits enable row level security;

create policy "Users can CRUD own habits"
  on public.habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- HABIT COMPLETIONS TABLE
-- ============================================
create table public.habit_completions (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  completed_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(habit_id, completed_date)
);

alter table public.habit_completions enable row level security;

create policy "Users can CRUD own habit completions"
  on public.habit_completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- JOURNAL ENTRIES TABLE
-- ============================================
create table public.journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  mood text,
  prompt text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.journal_entries enable row level security;

create policy "Users can CRUD own journal entries"
  on public.journal_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
create table public.transactions (
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

create policy "Users can CRUD own transactions"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- ASSIGNMENTS TABLE
-- ============================================
create table public.assignments (
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

create policy "Users can CRUD own assignments"
  on public.assignments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- STREAK POSTS TABLE
-- ============================================
create table public.streak_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  media_url text not null,
  media_type text check (media_type in ('image', 'video')) default 'image' not null,
  caption text,
  post_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.streak_posts enable row level security;

create policy "Anyone can view streak posts"
  on public.streak_posts for select
  using (true);

create policy "Users can insert own streak posts"
  on public.streak_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own streak posts"
  on public.streak_posts for delete
  using (auth.uid() = user_id);

-- ============================================
-- STREAK LIKES TABLE
-- ============================================
create table public.streak_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.streak_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

alter table public.streak_likes enable row level security;

create policy "Anyone can view streak likes"
  on public.streak_likes for select
  using (true);

create policy "Users can like posts"
  on public.streak_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike posts"
  on public.streak_likes for delete
  using (auth.uid() = user_id);

-- ============================================
-- STREAK COMMENTS TABLE
-- ============================================
create table public.streak_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.streak_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.streak_comments enable row level security;

create policy "Anyone can view streak comments"
  on public.streak_comments for select
  using (true);

create policy "Users can add comments"
  on public.streak_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.streak_comments for delete
  using (auth.uid() = user_id);

-- ============================================
-- USER STREAKS TABLE
-- ============================================
create table public.user_streaks (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  current_streak integer default 0 not null,
  longest_streak integer default 0 not null,
  last_post_date date,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_streaks enable row level security;

create policy "Anyone can view user streaks"
  on public.user_streaks for select
  using (true);

create policy "Users can update own streak"
  on public.user_streaks for update
  using (auth.uid() = user_id);

create policy "Users can insert own streak"
  on public.user_streaks for insert
  with check (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
create index idx_tasks_user_id on public.tasks(user_id);
create index idx_tasks_due_date on public.tasks(due_date);
create index idx_habits_user_id on public.habits(user_id);
create index idx_habit_completions_habit_id on public.habit_completions(habit_id);
create index idx_habit_completions_date on public.habit_completions(completed_date);
create index idx_journal_entries_user_id on public.journal_entries(user_id);
create index idx_transactions_user_id on public.transactions(user_id);
create index idx_assignments_user_id on public.assignments(user_id);
create index idx_streak_posts_user_id on public.streak_posts(user_id);
create index idx_streak_posts_post_date on public.streak_posts(post_date desc);
create index idx_streak_likes_post_id on public.streak_likes(post_id);
create index idx_streak_likes_user_id on public.streak_likes(user_id);
create index idx_streak_comments_post_id on public.streak_comments(post_id);
create index idx_streak_comments_user_id on public.streak_comments(user_id);
create index idx_user_streaks_user_id on public.user_streaks(user_id);

-- ============================================
-- STREAK AUTO-UPDATE FUNCTION
-- ============================================
create or replace function public.handle_streak_post()
returns trigger as $$
declare
  streak_record record;
  days_since_last_post integer;
begin
  -- Get or create streak record
  insert into public.user_streaks (user_id, current_streak, longest_streak, last_post_date)
  values (new.user_id, 1, 1, new.post_date)
  on conflict (user_id) do update set
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
          updated_at = timezone('utc'::text, now())
      where user_id = new.user_id;
    elsif days_since_last_post = 0 then
      -- Same day - no change to streak
      update public.user_streaks
      set last_post_date = new.post_date,
          updated_at = timezone('utc'::text, now())
      where user_id = new.user_id;
    else
      -- Streak broken - restart
      update public.user_streaks
      set current_streak = 1,
          last_post_date = new.post_date,
          updated_at = timezone('utc'::text, now())
      where user_id = new.user_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_streak_post_created
  after insert on public.streak_posts
  for each row execute function public.handle_streak_post();
