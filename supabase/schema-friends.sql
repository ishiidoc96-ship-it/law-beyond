-- ============================================
-- FRIENDS SYSTEM MIGRATION
-- Run this ONCE on your Supabase project
-- ============================================

-- ============================================
-- 1. FRIEND REQUESTS TABLE
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

create policy "Users can view own friend requests"
  on public.friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send friend requests"
  on public.friend_requests for insert
  with check (auth.uid() = sender_id);

create policy "Users can update own friend requests"
  on public.friend_requests for update
  using (auth.uid() = receiver_id);

create policy "Users can delete own friend requests"
  on public.friend_requests for delete
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- ============================================
-- 2. FRIENDS TABLE
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

create policy "Users can view own friendships"
  on public.friends for select
  using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

create policy "System can insert friendships"
  on public.friends for insert
  with check (true);

create policy "Users can delete own friendships"
  on public.friends for delete
  using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- ============================================
-- 3. INDEXES
-- ============================================
create index if not exists idx_friend_requests_sender on public.friend_requests(sender_id);
create index if not exists idx_friend_requests_receiver on public.friend_requests(receiver_id);
create index if not exists idx_friend_requests_status on public.friend_requests(status);
create index if not exists idx_friends_user1 on public.friends(user_id_1);
create index if not exists idx_friends_user2 on public.friends(user_id_2);

-- ============================================
-- 4. FUNCTION: send_friend_request
-- ============================================
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

  -- Check if already friends
  if exists (
    select 1 from public.friends
    where (user_id_1 = sender_id and user_id_2 = p_receiver_id)
       or (user_id_1 = p_receiver_id and user_id_2 = sender_id)
  ) then
    return json_build_object('success', false, 'error', 'Already friends');
  end if;

  -- Check for existing request
  select * into existing_record
  from public.friend_requests
  where ((sender_id = p_receiver_id and receiver_id = sender_id)
      or (sender_id = sender_id and receiver_id = p_receiver_id));

  if found then
    if existing_record.status = 'pending' and existing_record.sender_id = sender_id then
      return json_build_object('success', false, 'error', 'Request already sent');
    elsif existing_record.status = 'pending' and existing_record.receiver_id = sender_id then
      -- Auto-accept: they sent us a request, we accept it
      update public.friend_requests set status = 'accepted', updated_at = now()
      where id = existing_record.id;

      -- Create friendship
      insert into public.friends (user_id_1, user_id_2)
      values (least(sender_id, p_receiver_id), greatest(sender_id, p_receiver_id))
      on conflict do nothing;

      return json_build_object('success', true, 'action', 'auto_accepted');
    end if;
  end if;

  -- Create new request
  insert into public.friend_requests (sender_id, receiver_id)
  values (sender_id, p_receiver_id)
  on conflict do update set status = 'pending', updated_at = now();

  -- Create notification
  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (
    p_receiver_id,
    'friend_request',
    'Friend request',
    coalesce((select full_name from public.profiles where id = sender_id), 'Someone') || ' sent you a friend request',
    '/streaks',
    sender_id
  );

  return json_build_object('success', true, 'action', 'request_sent');
end;
$$ language plpgsql security definer;

-- ============================================
-- 5. FUNCTION: respond_friend_request
-- ============================================
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
    update public.friend_requests set status = 'accepted', updated_at = now()
    where id = p_request_id;

    insert into public.friends (user_id_1, user_id_2)
    values (least(sender, receiver), greatest(sender, receiver))
    on conflict do nothing;

    -- Notify sender
    insert into public.notifications (user_id, type, title, body, link, actor_id)
    values (
      sender,
      'friend_accepted',
      'Friend request accepted',
      coalesce((select full_name from public.profiles where id = receiver), 'Someone') || ' accepted your friend request',
      '/streaks',
      receiver
    );

    return json_build_object('success', true, 'action', 'accepted');
  else
    update public.friend_requests set status = 'rejected', updated_at = now()
    where id = p_request_id;

    return json_build_object('success', true, 'action', 'rejected');
  end if;
end;
$$ language plpgsql security definer;

-- ============================================
-- 6. FUNCTION: remove_friend
-- ============================================
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

-- ============================================
-- 7. FUNCTION: get_friends
-- ============================================
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

-- ============================================
-- 8. FUNCTION: search_users (by name or email)
-- ============================================
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
-- 9. NOTIFICATION TRIGGER: friend_request
-- ============================================
-- Already handled inside send_friend_request function above
-- (notification is inserted directly)
