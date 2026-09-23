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

  -- Le dossier de bienvenue fait foi pour la date / le lieu / le type d'examen.
  UPDATE public.apprenants a
     SET numero_dossier_cma = CASE WHEN v_cma IS NOT NULL AND COALESCE(a.numero_dossier_cma,'') = '' THEN v_cma ELSE a.numero_dossier_cma END,
         mot_de_passe_cma   = CASE WHEN v_mdp IS NOT NULL THEN v_mdp ELSE a.mot_de_passe_cma END,
         date_examen_theorique = COALESCE(v_date, a.date_examen_theorique),
         type_examen = COALESCE(v_type, a.type_examen),
         lieu_examen = COALESCE(v_lieu, a.lieu_examen)
   WHERE a.id = NEW.apprenant_id;

  RETURN NEW;
END;
$function$;