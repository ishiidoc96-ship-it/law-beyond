-- ============================================
-- FEEDBACK TABLE
-- ============================================
create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  message text not null,
  rating integer check (rating >= 1 and rating <= 5),
  user_agent text,
  url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.feedback enable row level security;

create policy "Users can insert own feedback" on public.feedback
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "Authenticated users can read feedback" on public.feedback
  for select using (auth.uid() is not null);

create index idx_feedback_created_at on public.feedback(created_at desc);
create index idx_feedback_user_id on public.feedback(user_id); 