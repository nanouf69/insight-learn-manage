-- Autorisation exceptionnelle de refaire un Examen Blanc (passage contaminé).
-- AUCUNE donnée pédagogique existante n'est touchée par cette migration.
CREATE TABLE public.exam_retake_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  exam_id text NOT NULL,
  motif text NOT NULL DEFAULT 'Nouveau passage autorisé par Admin à la suite d''un passage effectué sur une version erronée',
  result_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  granted_by uuid,
  granted_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX idx_exam_retake_auth_active
  ON public.exam_retake_authorizations (apprenant_id, exam_id)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.exam_retake_authorizations TO authenticated;
GRANT ALL ON public.exam_retake_authorizations TO service_role;

ALTER TABLE public.exam_retake_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture des autorisations par les utilisateurs connectés"
  ON public.exam_retake_authorizations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins créent des autorisations"
  ON public.exam_retake_authorizations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins modifient les autorisations"
  ON public.exam_retake_authorizations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Le délai de 48 h est levé UNIQUEMENT si une autorisation active existe.
CREATE OR REPLACE FUNCTION public.enforce_exam_retake_delay()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_exam text;
  v_tent integer;
  v_already_started boolean;
  v_last timestamptz;
  v_auth uuid;
BEGIN
  IF COALESCE(NEW.exercice_type, '') <> 'examen_blanc' THEN
    RETURN NEW;
  END IF;

  v_exam := split_part(COALESCE(NEW.exercice_id, ''), '__', 1);
  IF v_exam = '' THEN
    RETURN NEW;
  END IF;

  v_tent := GREATEST(
    COALESCE(NULLIF(substring(COALESCE(NEW.exercice_id, '') FROM '_t([0-9]+)$'), '')::int, 1),
    COALESCE(NEW.tentative, 1)
  );

  IF v_tent <= 1 THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.reponses_apprenants r
    WHERE r.apprenant_id = NEW.apprenant_id
      AND r.exercice_type = 'examen_blanc'
      AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
      AND GREATEST(
            COALESCE(NULLIF(substring(COALESCE(r.exercice_id, '') FROM '_t([0-9]+)$'), '')::int, 1),
            COALESCE(r.tentative, 1)
          ) >= v_tent
  ) INTO v_already_started;

  IF v_already_started THEN
    RETURN NEW;
  END IF;

  SELECT MAX(COALESCE(r.submitted_at, r.updated_at, r.created_at))
    INTO v_last
  FROM public.reponses_apprenants r
  WHERE r.apprenant_id = NEW.apprenant_id
    AND r.exercice_type = 'examen_blanc'
    AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
    AND r.completed IS TRUE;

  IF v_last IS NOT NULL AND now() < v_last + interval '48 hours' THEN
    SELECT a.id INTO v_auth
    FROM public.exam_retake_authorizations a
    WHERE a.apprenant_id = NEW.apprenant_id
      AND a.exam_id = v_exam
      AND a.consumed_at IS NULL
      AND a.revoked_at IS NULL
    ORDER BY a.created_at ASC
    LIMIT 1;

    IF v_auth IS NOT NULL THEN
      UPDATE public.exam_retake_authorizations
         SET consumed_at = now()
       WHERE id = v_auth;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'EXAM_RETAKE_DELAY_48H: nouvelle tentative possible le %',
      to_char((v_last + interval '48 hours') AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY HH24"h"MI')
      USING ERRCODE = 'P0471';
  END IF;

  RETURN NEW;
END;
$function$;