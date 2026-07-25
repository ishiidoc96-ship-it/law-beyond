-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Store Supabase credentials as PostgreSQL settings for cron jobs
ALTER DATABASE postgres SET "app.settings.supabase_url" = 'https://xlwbaugdebeqcsvayufy.supabase.co';
ALTER DATABASE postgres SET "app.settings.service_role_key" = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsd2JhdWdkZWJlcWNzdmF5dWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQ1MzUwNiwiZXhwIjoyMDk5MDI5NTA2fQ.d9HZoR6imFrkbuKJp3aatnVWYXQaXU9O6a8Oda_Vt4w';

-- Drop existing cron jobs if they exist
SELECT cron.unschedule('streak-reminder-daily');
SELECT cron.unschedule('deadline-reminder-6h');
SELECT cron.unschedule('reset-today-posted');

-- CRITICAL: Reset today_posted flag daily at midnight UTC (before streak reminder runs)
SELECT cron.schedule(
  'reset-today-posted',
  '0 0 * * *',
  $$
  SELECT public.reset_today_posted();
  $$
);

-- Streak reminder: daily at 20:00 UTC (evening)
SELECT cron.schedule(
  'streak-reminder-daily',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/streak-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Deadline reminder: every 6 hours
SELECT cron.schedule(
  'deadline-reminder-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/deadline-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
