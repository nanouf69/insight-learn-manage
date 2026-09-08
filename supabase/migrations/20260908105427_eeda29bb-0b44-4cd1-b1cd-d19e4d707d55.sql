CREATE OR REPLACE FUNCTION public.save_canonical_quiz_question(
  p_fournisseur_token text,
  p_quiz_id text,
  p_section_id bigint,
  p_legacy_question_id bigint,
  p_position integer,
  p_enonce text,
  p_choix jsonb,
  p_image text DEFAULT NULL,
  p_image_size text DEFAULT NULL,
  p_explication text DEFAULT NULL,
  p_active boolean DEFAULT true
)
RETURNS public.quiz_questions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'legacy_canonical_write_disabled' USING ERRCODE = '0A000';
END;
$$;

REVOKE ALL ON FUNCTION public.save_canonical_quiz_question(text,text,bigint,bigint,integer,text,jsonb,text,text,text,boolean) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.prevent_canonical_question_reactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.active = false AND NEW.active = true THEN
    RAISE EXCEPTION 'canonical_question_deleted' USING ERRCODE = 'P0409';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_canonical_question_reactivation ON public.quiz_questions;
CREATE TRIGGER prevent_canonical_question_reactivation
BEFORE UPDATE OF active ON public.quiz_questions
FOR EACH ROW
WHEN (OLD.active = false AND NEW.active = true)
EXECUTE FUNCTION public.prevent_canonical_question_reactivation();

REVOKE ALL ON FUNCTION public.prevent_canonical_question_reactivation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_canonical_question_reactivation() TO service_role;

COMMENT ON FUNCTION public.save_canonical_quiz_question(text,text,bigint,bigint,integer,text,jsonb,text,text,text,boolean) IS
  'Ancienne écriture désactivée : utiliser exclusivement les commandes canoniques avec contrôle de version.';
COMMENT ON FUNCTION public.prevent_canonical_question_reactivation() IS
  'Protection finale empêchant toute réactivation implicite d une question canonique supprimée.';