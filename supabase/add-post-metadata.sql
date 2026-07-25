-- Add Instagram-style fields to streak_posts
-- Run this in Supabase SQL Editor

ALTER TABLE public.streak_posts
ADD COLUMN IF NOT EXISTS filter_name text,
ADD COLUMN IF NOT EXISTS music_track text,
ADD COLUMN IF NOT EXISTS location text;

-- Update the createStreakPost function to accept new fields
CREATE OR REPLACE FUNCTION public.create_streak_post(
  p_user_id uuid,
  p_media_url text,
  p_media_type text DEFAULT 'image',
  p_caption text DEFAULT NULL,
  p_filter_name text DEFAULT NULL,
  p_music_track text DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  new_post RECORD;
BEGIN
  INSERT INTO public.streak_posts (user_id, media_url, media_type, caption, filter_name, music_track, location)
  VALUES (p_user_id, p_media_url, p_media_type, p_caption, p_filter_name, p_music_track, p_location)
  RETURNING * INTO new_post;

  RETURN json_build_object(
    'id', new_post.id,
    'user_id', new_post.user_id,
    'media_url', new_post.media_url,
    'media_type', new_post.media_type,
    'caption', new_post.caption,
    'filter_name', new_post.filter_name,
    'music_track', new_post.music_track,
    'location', new_post.location,
    'post_date', new_post.post_date,
    'created_at', new_post.created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
