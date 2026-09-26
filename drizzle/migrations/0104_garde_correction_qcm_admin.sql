CREATE OR REPLACE FUNCTION public.garde_correction_admin_quiz()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin')
     OR current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF (
    EXISTS (
      SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(OLD.details->'correctionsIA')='object'
                                    THEN OLD.details->'correctionsIA' ELSE '{}'::jsonb END) e
      WHERE e.value->>'validatedByAdmin'='true' OR e.value->>'manuel'='true'
    )
    OR OLD.details->'correctionQCMAdmin'->>'validatedByAdmin' = 'true'
    OR OLD.details->'correctionQCMAdmin'->>'manuel' = 'true'
  ) AND (
       NEW.score_obtenu IS DISTINCT FROM OLD.score_obtenu
    OR NEW.note_sur_20  IS DISTINCT FROM OLD.note_sur_20
    OR NEW.reussi       IS DISTINCT FROM OLD.reussi
    OR (NEW.details->'correctionsIA') IS DISTINCT FROM (OLD.details->'correctionsIA')
    OR (NEW.details->'correctionQCMAdmin') IS DISTINCT FROM (OLD.details->'correctionQCMAdmin')
  ) THEN
    RAISE EXCEPTION 'CORRECTION_ADMIN_PROTEGEE : cette note a été corrigée par un formateur et ne peut pas être modifiée depuis le compte apprenant'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;