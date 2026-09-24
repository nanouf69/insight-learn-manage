CREATE TABLE public.bilan_reponse_reclassements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  module_id integer NOT NULL,
  exercice_id integer NOT NULL,
  tentative integer NOT NULL,
  cle text NOT NULL,
  uid uuid NOT NULL,
  ancien_statut text NOT NULL CHECK (ancien_statut = 'VERSION_NON_PROUVEE'),
  nouveau_statut text NOT NULL CHECK (nouveau_statut = 'CERTAINE'),
  motif text NOT NULL,
  preuve jsonb NOT NULL DEFAULT '{}'::jsonb,
  operation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apprenant_id, module_id, exercice_id, tentative, cle)
);
GRANT SELECT ON public.bilan_reponse_reclassements TO authenticated;
GRANT ALL ON public.bilan_reponse_reclassements TO service_role;
ALTER TABLE public.bilan_reponse_reclassements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin lit reclassements" ON public.bilan_reponse_reclassements FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Apprenant lit ses reclassements" ON public.bilan_reponse_reclassements FOR SELECT TO authenticated USING (public.is_current_user_apprenant(apprenant_id));

CREATE TRIGGER trg_bilan_reclassements_append_only BEFORE UPDATE OR DELETE ON public.bilan_reponse_reclassements FOR EACH ROW EXECUTE FUNCTION public.bilan_migration_append_only();
CREATE TRIGGER trg_bilan_reclassements_no_truncate BEFORE TRUNCATE ON public.bilan_reponse_reclassements FOR EACH STATEMENT EXECUTE FUNCTION public.bilan_migration_append_only();

CREATE OR REPLACE FUNCTION public.bilan_reclassement_valide()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bilan_reponse_statuts s WHERE s.apprenant_id=NEW.apprenant_id AND s.module_id=NEW.module_id
      AND s.exercice_id=NEW.exercice_id AND s.tentative=NEW.tentative AND s.cle=NEW.cle AND s.uid=NEW.uid AND s.statut='VERSION_NON_PROUVEE') THEN
    RAISE EXCEPTION 'Reclassement refusé : réponse À VÉRIFIER introuvable' USING ERRCODE='P0501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bilan_passage_categories c WHERE c.apprenant_id=NEW.apprenant_id AND c.module_id=NEW.module_id
      AND c.exercice_id=NEW.exercice_id AND c.tentative=NEW.tentative AND c.categorie='ORANGE') THEN
    RAISE EXCEPTION 'Reclassement refusé : passage non ORANGE' USING ERRCODE='P0501';
  END IF;
  IF EXISTS (SELECT 1 FROM bilan_question_identites i WHERE i.uid=NEW.uid AND (i.litigieux OR i.etat_initial<>'actif')) THEN
    RAISE EXCEPTION 'Reclassement refusé : identité litigieuse ou non active' USING ERRCODE='P0501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_bilan_reclassement_valide BEFORE INSERT ON public.bilan_reponse_reclassements FOR EACH ROW EXECUTE FUNCTION public.bilan_reclassement_valide();

CREATE OR REPLACE VIEW public.bilan_reponse_statuts_effectifs WITH (security_invoker = true) AS
SELECT s.id, s.apprenant_id, s.module_id, s.exercice_id, s.tentative, s.cle, s.uid,
  COALESCE(r.nouveau_statut, s.statut) AS statut, s.statut AS statut_initial, (r.id IS NOT NULL) AS reclasse,
  s.reponse, s.created_at
FROM public.bilan_reponse_statuts s
LEFT JOIN public.bilan_reponse_reclassements r ON r.apprenant_id=s.apprenant_id AND r.module_id=s.module_id
  AND r.exercice_id=s.exercice_id AND r.tentative=s.tentative AND r.cle=s.cle;
GRANT SELECT ON public.bilan_reponse_statuts_effectifs TO authenticated;
GRANT SELECT ON public.bilan_reponse_statuts_effectifs TO service_role;

CREATE OR REPLACE FUNCTION public.bilan_garde_reponses_verrouillees()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE m text[]; r record;
BEGIN
  m := regexp_match(NEW.exercice_id, '^module_(\d+)_exo_(\d+)$');
  IF m IS NULL THEN RETURN NEW; END IF;
  FOR r IN SELECT cle, reponse FROM bilan_reponse_statuts_effectifs
            WHERE apprenant_id = NEW.apprenant_id AND module_id = m[1]::int AND exercice_id = m[2]::int
              AND tentative = COALESCE(NEW.tentative, 1) AND statut <> 'CERTAINE' LOOP
    IF TG_OP = 'UPDATE' AND OLD.reponses ? r.cle THEN
      NEW.reponses := jsonb_set(COALESCE(NEW.reponses,'{}'::jsonb), ARRAY[r.cle], OLD.reponses->r.cle);
    ELSIF r.reponse IS NOT NULL THEN
      NEW.reponses := jsonb_set(COALESCE(NEW.reponses,'{}'::jsonb), ARRAY[r.cle], r.reponse);
    END IF;
  END LOOP;
  RETURN NEW;
END $function$;