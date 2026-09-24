-- Étape 1 : infrastructure inerte de la future synchronisation Bilan VTC (module 5) <-> Bilan TAXI (module 11).
-- Aucune fonction de synchronisation, aucun trigger sur module_editor_state, aucune ligne insérée.

CREATE TABLE public.bilan_sync_liens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matiere_key text NOT NULL,
  vtc_module_id integer NOT NULL DEFAULT 5,
  vtc_exercice_id integer NOT NULL,
  vtc_question_id integer NOT NULL,
  taxi_module_id integer NOT NULL DEFAULT 11,
  taxi_exercice_id integer NOT NULL,
  taxi_question_id integer NOT NULL,
  statut text NOT NULL DEFAULT 'en_attente',
  motif text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bilan_sync_liens_modules CHECK (vtc_module_id = 5 AND taxi_module_id = 11),
  -- Seules les matières communes A-E peuvent être liées ; F(V)/G(V)/H (505-507) et F/G(T) (605-606) exclues.
  CONSTRAINT bilan_sync_liens_matieres_communes CHECK (
    (matiere_key, vtc_exercice_id, taxi_exercice_id) IN (
      ('bilan_t3p',500,600),('bilan_gestion',501,601),('bilan_securite',502,602),
      ('bilan_francais',503,603),('bilan_anglais',504,604))
  ),
  CONSTRAINT bilan_sync_liens_statut CHECK (statut IN ('liee','en_attente','specifique')),
  CONSTRAINT bilan_sync_liens_vtc_unique UNIQUE (vtc_exercice_id, vtc_question_id),
  CONSTRAINT bilan_sync_liens_taxi_unique UNIQUE (taxi_exercice_id, taxi_question_id)
);
COMMENT ON TABLE public.bilan_sync_liens IS 'Correspondances question VTC <-> TAXI par identifiant stable (jamais par position). Étape 1 : vide et inerte.';

GRANT SELECT, INSERT, UPDATE ON public.bilan_sync_liens TO authenticated;
GRANT ALL ON public.bilan_sync_liens TO service_role;
ALTER TABLE public.bilan_sync_liens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les liens bilan" ON public.bilan_sync_liens FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins ajoutent les liens bilan" ON public.bilan_sync_liens FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins modifient le statut des liens bilan" ON public.bilan_sync_liens FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Aucune suppression ; identité (exercice/question) immuable : seul le statut/motif peut évoluer.
CREATE OR REPLACE FUNCTION public.bilan_sync_liens_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'BILAN_SYNC_LIEN_DELETE_INTERDIT';
  END IF;
  IF NEW.matiere_key IS DISTINCT FROM OLD.matiere_key
     OR NEW.vtc_exercice_id IS DISTINCT FROM OLD.vtc_exercice_id
     OR NEW.vtc_question_id IS DISTINCT FROM OLD.vtc_question_id
     OR NEW.taxi_exercice_id IS DISTINCT FROM OLD.taxi_exercice_id
     OR NEW.taxi_question_id IS DISTINCT FROM OLD.taxi_question_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'BILAN_SYNC_LIEN_IDENTITE_IMMUABLE';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_bilan_sync_liens_guard BEFORE UPDATE OR DELETE ON public.bilan_sync_liens
FOR EACH ROW EXECUTE FUNCTION public.bilan_sync_liens_guard();

CREATE TABLE public.bilan_sync_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lien_id uuid REFERENCES public.bilan_sync_liens(id),
  evenement text NOT NULL,
  sens text,
  source_module_id integer,
  cible_module_id integer,
  question_id integer,
  avant jsonb,
  apres jsonb,
  empreinte_avant text,
  empreinte_apres text,
  auteur uuid,
  motif text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bilan_sync_journal_sens CHECK (sens IS NULL OR sens IN ('vtc_vers_taxi','taxi_vers_vtc'))
);
COMMENT ON TABLE public.bilan_sync_journal IS 'Journal append-only de la synchronisation Bilan VTC <-> TAXI. Étape 1 : vide.';

GRANT SELECT, INSERT ON public.bilan_sync_journal TO authenticated;
GRANT ALL ON public.bilan_sync_journal TO service_role;
ALTER TABLE public.bilan_sync_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent le journal sync bilan" ON public.bilan_sync_journal FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins ajoutent au journal sync bilan" ON public.bilan_sync_journal FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_bilan_sync_journal_append_only BEFORE UPDATE OR DELETE ON public.bilan_sync_journal
FOR EACH ROW EXECUTE FUNCTION public.forbid_mutation_append_only();
CREATE TRIGGER trg_bilan_sync_journal_no_truncate BEFORE TRUNCATE ON public.bilan_sync_journal
FOR EACH STATEMENT EXECUTE FUNCTION public.forbid_mutation_append_only();