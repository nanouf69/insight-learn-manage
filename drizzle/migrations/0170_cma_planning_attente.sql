CREATE TABLE public.cma_planning_attente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_examen date NOT NULL,
  heure text NOT NULL,
  filiere text NOT NULL CHECK (filiere IN ('VTC','TAXI')),
  jury text NOT NULL DEFAULT '',
  numero integer NOT NULL DEFAULT 0,
  prenom_pdf text NOT NULL,
  nom_pdf text NOT NULL,
  nom_normalise text NOT NULL,
  statut_rapprochement text NOT NULL CHECK (statut_rapprochement IN ('ambigu','a_verifier','inconnu')),
  raison text,
  candidats_ids uuid[] NOT NULL DEFAULT '{}',
  source_fichier text NOT NULL DEFAULT '',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cma_planning_attente_cle UNIQUE (source_fichier, date_examen, heure, filiere, jury, numero, nom_normalise)
);
GRANT SELECT, INSERT ON public.cma_planning_attente TO authenticated;
GRANT ALL ON public.cma_planning_attente TO service_role;
ALTER TABLE public.cma_planning_attente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin lit attente cma" ON public.cma_planning_attente FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin ajoute attente cma" ON public.cma_planning_attente FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
COMMENT ON TABLE public.cma_planning_attente IS 'Lignes du PDF planning CMA non rattachées à une fiche (inconnu/ambigu/à vérifier). Ajout seul. Aucun compte créé.';

CREATE TABLE public.cma_planning_attente_rattachements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attente_id uuid NOT NULL UNIQUE REFERENCES public.cma_planning_attente(id),
  apprenant_id uuid NOT NULL,
  ligne_id uuid NOT NULL REFERENCES public.cma_planning_lignes(id),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cma_planning_attente_rattachements TO authenticated;
GRANT ALL ON public.cma_planning_attente_rattachements TO service_role;
ALTER TABLE public.cma_planning_attente_rattachements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin lit rattachements cma" ON public.cma_planning_attente_rattachements FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
COMMENT ON TABLE public.cma_planning_attente_rattachements IS 'Rattachement manuel admin d''une ligne en attente à une fiche existante. Ajout seul ; la ligne en attente d''origine est conservée.';

CREATE OR REPLACE FUNCTION public.rattacher_attente_cma(p_attente uuid, p_apprenant uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.cma_planning_attente; v_ligne uuid; v_deja uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE='42501'; END IF;
  SELECT * INTO a FROM public.cma_planning_attente WHERE id = p_attente FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ligne en attente introuvable'; END IF;
  SELECT apprenant_id INTO v_deja FROM public.cma_planning_attente_rattachements WHERE attente_id = p_attente;
  IF v_deja IS NOT NULL THEN
    IF v_deja = p_apprenant THEN RETURN (SELECT ligne_id FROM public.cma_planning_attente_rattachements WHERE attente_id = p_attente); END IF;
    RAISE EXCEPTION 'Ligne déjà rattachée à une autre fiche' USING ERRCODE='23505';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.apprenants WHERE id = p_apprenant AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Fiche introuvable'; END IF;
  INSERT INTO public.cma_planning_lignes(apprenant_id,date_examen,heure,filiere,jury,numero,prenom_pdf,nom_pdf,raison_rapprochement,source_fichier)
  VALUES (p_apprenant,a.date_examen,a.heure,a.filiere,NULLIF(a.jury,''),NULLIF(a.numero,0),a.prenom_pdf,a.nom_pdf,'Rattachement manuel admin depuis ligne en attente',NULLIF(a.source_fichier,''))
  ON CONFLICT (apprenant_id,date_examen,heure,filiere) DO NOTHING RETURNING id INTO v_ligne;
  IF v_ligne IS NULL THEN
    SELECT id INTO v_ligne FROM public.cma_planning_lignes WHERE apprenant_id=p_apprenant AND date_examen=a.date_examen AND heure=a.heure AND filiere=a.filiere;
  END IF;
  INSERT INTO public.cma_planning_attente_rattachements(attente_id,apprenant_id,ligne_id) VALUES (p_attente,p_apprenant,v_ligne);
  RETURN v_ligne;
END $$;
REVOKE ALL ON FUNCTION public.rattacher_attente_cma(uuid,uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.rattacher_attente_cma(uuid,uuid) TO authenticated;