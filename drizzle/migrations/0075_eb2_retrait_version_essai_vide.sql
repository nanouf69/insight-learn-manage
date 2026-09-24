CREATE OR REPLACE FUNCTION public.core_enforce_single_active_version()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  nb_actives integer;
  a_deja_publie boolean;
  retrait_essai_vide boolean := false;
BEGIN
  SELECT count(*) INTO nb_actives FROM public.exam_content_versions
  WHERE exam_id = NEW.exam_id AND statut = 'publiee' AND retired_at IS NULL;
  IF nb_actives > 1 THEN
    RAISE EXCEPTION 'EXAM_VERSION_ACTIVE_UNIQUE: % versions actives pour l''examen % (une seule autorisee).', nb_actives, NEW.exam_id USING ERRCODE = 'P0481';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.exam_content_versions WHERE exam_id = NEW.exam_id AND published_at IS NOT NULL) INTO a_deja_publie;
  -- Exception limitée (accords 24/09/2026) : dernière version active retirable seulement si
  -- marqueur « migration » + zéro question exploitable + aucune tentative NON TERMINÉE rattachée.
  IF TG_OP = 'UPDATE' AND NEW.statut = 'retiree' AND NEW.retired_at IS NOT NULL THEN
    retrait_essai_vide :=
          NEW.content ? 'migration'
      AND COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(NEW.content->'questions') = 'array' THEN NEW.content->'questions' END), 0) = 0
      AND NOT EXISTS (SELECT 1 FROM public.exam_attempts_v2 a
                      WHERE a.exam_version_id = NEW.id
                        AND (a.finished_at IS NULL OR a.etat::text <> 'terminee'));
  END IF;
  IF nb_actives = 0 AND a_deja_publie AND NOT retrait_essai_vide THEN
    RAISE EXCEPTION 'EXAM_VERSION_ACTIVE_MANQUANTE: l''examen % se retrouverait sans version active.', NEW.exam_id USING ERRCODE = 'P0481';
  END IF;
  RETURN NULL;
END;
$function$;

DO $$
DECLARE v_id uuid := '9323f390-7044-4ff1-b1d7-fead84d5c535';
BEGIN
  IF EXISTS (SELECT 1 FROM public.exam_attempts_v2 WHERE exam_id='EB2' AND (finished_at IS NULL OR etat::text <> 'terminee')) THEN
    RAISE EXCEPTION 'STOP: tentative EB2 non terminee';
  END IF;
  UPDATE public.exam_content_versions SET statut='retiree', retired_at=now()
   WHERE id = v_id AND exam_id='EB2' AND statut='publiee' AND content ? 'migration';
  IF NOT FOUND THEN RAISE EXCEPTION 'STOP: version EB2 cible introuvable'; END IF;
  INSERT INTO public.audit_journal (operation, cible_type, cible_id, exam_id, exam_version_id, apres, origine)
  VALUES ('exam_version_retire','exam_content_versions', v_id::text, 'EB2', v_id,
          jsonb_build_object('motif','Retrait version essai 22/09 incomplète (F(V)/G(V) sans questions) bloquant EB2 - accord admin 24/09/2026'),
          'migration_eb2_retrait_version_essai_vide');
END $$;