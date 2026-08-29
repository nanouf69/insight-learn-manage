CREATE OR REPLACE FUNCTION public.sync_cma_from_dossier_bienvenue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cma text;
  v_mdp text;
  v_date text;
  v_type text;
  v_lieu text;
BEGIN
  IF NEW.type_document <> 'dossier-bienvenue' OR NEW.apprenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_cma  := NULLIF(TRIM(COALESCE(NEW.donnees->>'numero_dossier_cma', '')), '');
  v_mdp  := NULLIF(TRIM(COALESCE(NEW.donnees->>'mot_de_passe_cma', '')), '');
  v_date := NULLIF(TRIM(COALESCE(NEW.donnees->>'date_examen_theorique', '')), '');
  v_type := NULLIF(TRIM(COALESCE(NEW.donnees->>'type_examen', '')), '');
  v_lieu := NULLIF(TRIM(COALESCE(NEW.donnees->>'lieu_examen', '')), '');

  UPDATE public.apprenants a
     SET numero_dossier_cma = CASE WHEN v_cma IS NOT NULL AND COALESCE(a.numero_dossier_cma,'') = '' THEN v_cma ELSE a.numero_dossier_cma END,
         mot_de_passe_cma   = CASE WHEN v_mdp IS NOT NULL THEN v_mdp ELSE a.mot_de_passe_cma END,
         date_examen_theorique = CASE WHEN v_date IS NOT NULL AND COALESCE(a.date_examen_theorique,'') = '' THEN v_date ELSE a.date_examen_theorique END,
         type_examen = CASE WHEN v_type IS NOT NULL AND COALESCE(a.type_examen,'') = '' THEN v_type ELSE a.type_examen END,
         lieu_examen = CASE WHEN v_lieu IS NOT NULL AND COALESCE(a.lieu_examen,'') = '' THEN v_lieu ELSE a.lieu_examen END
   WHERE a.id = NEW.apprenant_id;

  RETURN NEW;
END;
$function$;

-- Rattrapage des dossiers déjà déposés
WITH latest AS (
  SELECT DISTINCT ON (d.apprenant_id)
    d.apprenant_id,
    NULLIF(TRIM(COALESCE(d.donnees->>'mot_de_passe_cma','')), '')      AS mdp,
    NULLIF(TRIM(COALESCE(d.donnees->>'numero_dossier_cma','')), '')    AS cma,
    NULLIF(TRIM(COALESCE(d.donnees->>'date_examen_theorique','')), '') AS dte,
    NULLIF(TRIM(COALESCE(d.donnees->>'type_examen','')), '')           AS typ,
    NULLIF(TRIM(COALESCE(d.donnees->>'lieu_examen','')), '')           AS lieu
  FROM public.apprenant_documents_completes d
  WHERE d.type_document = 'dossier-bienvenue' AND d.apprenant_id IS NOT NULL
  ORDER BY d.apprenant_id, d.created_at DESC
)
UPDATE public.apprenants a
   SET mot_de_passe_cma      = COALESCE(NULLIF(a.mot_de_passe_cma,''), l.mdp),
       numero_dossier_cma    = COALESCE(NULLIF(a.numero_dossier_cma,''), l.cma),
       date_examen_theorique = COALESCE(NULLIF(a.date_examen_theorique,''), l.dte),
       type_examen           = COALESCE(NULLIF(a.type_examen,''), l.typ),
       lieu_examen           = COALESCE(NULLIF(a.lieu_examen,''), l.lieu)
  FROM latest l
 WHERE a.id = l.apprenant_id;