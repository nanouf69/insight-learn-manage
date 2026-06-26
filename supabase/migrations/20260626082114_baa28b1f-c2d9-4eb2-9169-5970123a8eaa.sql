DO $$
DECLARE v_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'relance-50pct-1mois-avant-examen' LIMIT 1;
    IF v_job_id IS NOT NULL THEN PERFORM cron.unschedule(v_job_id); END IF;

    PERFORM cron.schedule(
      'relance-50pct-1mois-avant-examen',
      '0 10 * * *',
      $cron$SELECT net.http_post(
        url := 'https://qywdsohyuigjmclemqgm.supabase.co/functions/v1/relance-50pct-1mois-avant-examen',
        body := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb
      );$cron$
    );
  END IF;
END
$$;