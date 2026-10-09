CREATE OR REPLACE FUNCTION public.verifier_acces_apres_modification_apprenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_debut date;
  v_fin date;
BEGIN
  -- Aucun compte lié uniquement ; dossiers actifs avec e-mail.
  IF NEW.auth_user_id IS NOT NULL OR NEW.email IS NULL OR btrim(NEW.email) = ''
     OR NEW.deleted_at IS NOT NULL OR COALESCE(NEW.abandonnee, false) THEN
    RETURN NEW;
  END IF;
  v_debut := COALESCE(NEW.date_debut_cours_en_ligne::date, NEW.date_debut_formation::date);
  v_fin := COALESCE(NEW.date_fin_cours_en_ligne::date, NEW.date_fin_formation::date);
  IF v_debut IS NULL OR v_debut > (now() AT TIME ZONE 'Europe/Paris')::date
     OR (v_fin IS NOT NULL AND v_fin < (now() AT TIME ZONE 'Europe/Paris')::date) THEN
    RETURN NEW;
  END IF;
  -- Le service d'envoi refait tous les contrôles (éligibilité, réinscriptions bloquées).
  BEGIN
    PERFORM net.http_post(
      url := 'https://qywdsohyuigjmclemqgm.supabase.co/functions/v1/auto-send-credentials',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5d2Rzb2h5dWlnam1jbGVtcWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNDcxNTQsImV4cCI6MjA4NTcyMzE1NH0.9YXj7SGVrhlrQ6EuBzdaAit0sCSn9BQ8HCxau6QAies'),
      body := jsonb_build_object('apprenantId', NEW.id::text)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Jamais bloquant : la modification de la fiche est toujours enregistrée.
    RAISE WARNING 'verifier_acces_apres_modification_apprenant: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_zz_acces_auto_apres_modification ON public.apprenants;
CREATE TRIGGER trg_zz_acces_auto_apres_modification
AFTER UPDATE ON public.apprenants
FOR EACH ROW
EXECUTE FUNCTION public.verifier_acces_apres_modification_apprenant();