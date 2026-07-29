-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: on completion of module Pratique VTC (8) / TAXI (6), invoke edge function
CREATE OR REPLACE FUNCTION public.trigger_auto_send_pratique_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.module_id IN (6, 8) THEN
    PERFORM net.http_post(
      url := 'https://qywdsohyuigjmclemqgm.supabase.co/functions/v1/auto-send-pratique-booking',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('trigger', 'module_completion', 'apprenant_id', NEW.apprenant_id, 'module_id', NEW.module_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_send_pratique_booking ON public.apprenant_module_completion;
CREATE TRIGGER trg_auto_send_pratique_booking
AFTER INSERT ON public.apprenant_module_completion
FOR EACH ROW
EXECUTE FUNCTION public.trigger_auto_send_pratique_booking();

-- Safety-net cron: run every 30 minutes to catch any missed dispatches
DO $$
DECLARE v_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'auto-send-pratique-booking' LIMIT 1;
    IF v_job_id IS NOT NULL THEN PERFORM cron.unschedule(v_job_id); END IF;

    PERFORM cron.schedule(
      'auto-send-pratique-booking',
      '*/30 * * * *',
      $cron$SELECT net.http_post(
        url := 'https://qywdsohyuigjmclemqgm.supabase.co/functions/v1/auto-send-pratique-booking',
        body := '{"trigger":"cron"}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb
      );$cron$
    );
  END IF;
END
$$;