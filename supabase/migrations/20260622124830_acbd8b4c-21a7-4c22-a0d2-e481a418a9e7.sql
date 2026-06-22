DO $$
DECLARE
  v_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'relance-non-connexion-jour1'
    LIMIT 1;

    IF v_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_job_id);
    END IF;

    PERFORM cron.schedule(
      'relance-non-connexion-jour1',
      '0 9 * * *',
      $cron$SELECT net.http_post(
        url := 'https://qywdsohyuigjmclemqgm.supabase.co/functions/v1/relance-non-connexion-jour1',
        body := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb
      );$cron$
    );
  END IF;
END
$$;