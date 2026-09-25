CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.backup_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex')
);
REVOKE ALL ON private.backup_config FROM PUBLIC, anon, authenticated;
INSERT INTO private.backup_config (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.verify_backup_token(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT coalesce(length(p_token) > 0 AND EXISTS (
    SELECT 1 FROM private.backup_config WHERE token = p_token
  ), false)
$$;
REVOKE ALL ON FUNCTION public.verify_backup_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_backup_token(text) TO service_role;

SELECT cron.unschedule('backup-all-clinics-daily');
SELECT cron.schedule('backup-all-clinics-daily', '0 3 * * *', $cron$
  SELECT net.http_post(
    url := 'https://qbavkycmdkugwzumidyy.supabase.co/functions/v1/backup-clinic-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT token FROM private.backup_config WHERE id = 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
$cron$);