-- 0014_system_logs_retention.sql
-- Deletes system_logs rows older than 90 days.
-- Runs nightly at 02:00 UTC via pg_cron.
-- pg_cron dependency: when migrating to self-hosted Postgres (Phase 8+),
-- replace the cron.schedule call with your job scheduler of choice.
-- The prune_old_system_logs() function itself is standard SQL and carries over unchanged.

-- Step 1: retention function
CREATE OR REPLACE FUNCTION prune_old_system_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.system_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Step 2: schedule nightly at 02:00 UTC
SELECT cron.schedule(
  'prune-system-logs-nightly',
  '0 2 * * *',
  $$ SELECT prune_old_system_logs(); $$
);
