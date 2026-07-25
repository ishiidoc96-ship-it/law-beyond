-- Fix search_users to also search by email
-- Run this in Supabase SQL Editor to update the search function

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
