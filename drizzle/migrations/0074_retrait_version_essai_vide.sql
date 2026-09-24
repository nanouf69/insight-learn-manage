CREATE OR REPLACE FUNCTION public.core_enforce_single_active_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  nb_actives integer;
  a_deja_publie boolean;
  retrait_essai_vide boolean := false;
BEGIN
  SELECT count(*) INTO nb_actives
  FROM public.exam_content_versions
  WHERE exam_id = NEW.exam_id AND statut = 'publiee' AND retired_at IS NULL;

  IF nb_actives > 1 THEN
    RAISE EXCEPTION 'EXAM_VERSION_ACTIVE_UNIQUE: % versions actives pour l''examen % (une seule autorisee).',
      nb_actives, NEW.exam_id
      USING ERRCODE = 'P0481';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.exam_content_versions
    WHERE exam_id = NEW.exam_id AND published_at IS NOT NULL
  ) INTO a_deja_publie;

  -- Exception générique et limitée (accord 24/09/2026) : la dernière version active
  -- peut être retirée seulement si c'est une version d'essai/technique (marqueur
  -- « migration »), sans aucune question exploitable, jamais utilisée par un apprenant.
  IF TG_OP = 'UPDATE' AND NEW.statut = 'retiree' AND NEW.retired_at IS NOT NULL THEN
    retrait_essai_vide :=
          NEW.content ? 'migration'
      AND COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(NEW.content->'questions') = 'array'
                                           THEN NEW.content->'questions' END), 0) = 0
      AND NOT EXISTS (SELECT 1 FROM public.exam_attempts_v2 a WHERE a.exam_version_id = NEW.id);
  END IF;

  IF nb_actives = 0 AND a_deja_publie AND NOT retrait_essai_vide THEN
    RAISE EXCEPTION 'EXAM_VERSION_ACTIVE_MANQUANTE: l''examen % se retrouverait sans version active.', NEW.exam_id
      USING ERRCODE = 'P0481';
  END IF;

  RETURN NULL;
END;
$function$;