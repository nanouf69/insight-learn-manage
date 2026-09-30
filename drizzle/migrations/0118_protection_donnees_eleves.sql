-- Règle absolue 30/09 : aucune donnée élève ne disparaît.
ALTER TABLE public.apprenants ADD COLUMN IF NOT EXISTS compte_cours_archive_at timestamptz;
ALTER TABLE public.apprenants ADD COLUMN IF NOT EXISTS compte_cours_archive_par uuid;

CREATE TABLE IF NOT EXISTS public.donnees_eleves_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  table_nom text NOT NULL,
  apprenant_id uuid,
  ligne jsonb NOT NULL,
  auteur_uid uuid,
  auteur_role text,
  compte_test boolean NOT NULL DEFAULT false,
  motif text,
  alerte_envoyee_at timestamptz
);
GRANT SELECT ON public.donnees_eleves_suppressions TO authenticated;
GRANT ALL ON public.donnees_eleves_suppressions TO service_role;
ALTER TABLE public.donnees_eleves_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les suppressions" ON public.donnees_eleves_suppressions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.answer_state_historique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  response_id uuid,
  apprenant_id uuid,
  question_id text,
  ancienne_ligne jsonb NOT NULL,
  nouvelle_ligne jsonb NOT NULL
);
GRANT SELECT ON public.answer_state_historique TO authenticated;
GRANT ALL ON public.answer_state_historique TO service_role;
ALTER TABLE public.answer_state_historique ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent historique etat reponses" ON public.answer_state_historique FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.protege_journal_append_only() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION USING ERRCODE='P0521', MESSAGE='Journal protégé : suppression interdite'; END IF;
  IF TG_TABLE_NAME = 'donnees_eleves_suppressions'
     AND (to_jsonb(NEW) - 'alerte_envoyee_at') = (to_jsonb(OLD) - 'alerte_envoyee_at') THEN RETURN NEW; END IF;
  RAISE EXCEPTION USING ERRCODE='P0521', MESSAGE='Journal protégé : modification interdite';
END $$;
CREATE TRIGGER trg_des_append_only BEFORE UPDATE OR DELETE ON public.donnees_eleves_suppressions FOR EACH ROW EXECUTE FUNCTION public.protege_journal_append_only();
CREATE TRIGGER trg_ash_append_only BEFORE UPDATE OR DELETE ON public.answer_state_historique FOR EACH ROW EXECUTE FUNCTION public.protege_journal_append_only();

CREATE OR REPLACE FUNCTION public.historise_answer_state() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
    INSERT INTO public.answer_state_historique(response_id, apprenant_id, question_id, ancienne_ligne, nouvelle_ligne)
    VALUES (OLD.response_id, OLD.apprenant_id, OLD.question_id::text, to_jsonb(OLD), to_jsonb(NEW));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_answer_state_historique AFTER UPDATE ON public.answer_state FOR EACH ROW EXECUTE FUNCTION public.historise_answer_state();

-- Garde générique : copie préalable + alerte ; refus sauf compte de test ou autorisation SQL explicite.
CREATE OR REPLACE FUNCTION public.garde_donnee_eleve() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_mode text := TG_ARGV[0];
  v_row jsonb := to_jsonb(OLD);
  v_app uuid;
  v_test boolean := false;
  v_bypass boolean := coalesce(current_setting('app.suppression_eleve_autorisee', true), '') = 'on';
  v_refuse boolean;
BEGIN
  BEGIN
    v_app := nullif(CASE WHEN TG_TABLE_NAME='apprenants' THEN v_row->>'id' ELSE v_row->>'apprenant_id' END, '')::uuid;
  EXCEPTION WHEN others THEN v_app := NULL; END;
  IF v_app IS NOT NULL THEN
    BEGIN v_test := coalesce(public.est_compte_test(v_app), false); EXCEPTION WHEN others THEN v_test := false; END;
  END IF;
  v_refuse := CASE v_mode
    WHEN 'refuser' THEN true
    WHEN 'signature' THEN coalesce(v_row->>'type_document','') ~* '(emarg|signat)'
    ELSE false END;
  IF v_refuse AND NOT v_bypass AND NOT v_test THEN
    RAISE EXCEPTION USING ERRCODE='P0520',
      MESSAGE = format('Donnée élève protégée (%s) : suppression interdite. Aucune donnée élève ne doit disparaître.', TG_TABLE_NAME);
  END IF;
  INSERT INTO public.donnees_eleves_suppressions(table_nom, apprenant_id, ligne, auteur_uid, auteur_role, compte_test, motif)
  VALUES (TG_TABLE_NAME, v_app, v_row, auth.uid(), current_user, v_test,
          CASE WHEN v_bypass THEN 'autorisation SQL explicite' WHEN v_test THEN 'compte de test' ELSE 'suppression autorisée (table non bloquante)' END);
  RETURN OLD;
END $$;

DO $$
DECLARE t text; m text;
BEGIN
  FOR t, m IN SELECT * FROM (VALUES
    ('apprenants','refuser'),('reponses_apprenants','refuser'),('apprenant_quiz_results','refuser'),
    ('apprenant_module_completion','refuser'),('apprenant_module_activites','refuser'),('emargements_fc','refuser'),
    ('apprenant_documents_completes','refuser'),('answer_events','refuser'),('exam_attempts_v2','refuser'),
    ('bilan_passage_snapshots','refuser'),('bilan_passages_figes','refuser'),
    ('documents_inscription','signature'),('session_apprenants','copier'),('apprenant_connexions','copier')
  ) v(a,b) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_zz_garde_donnee_eleve ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_zz_garde_donnee_eleve BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.garde_donnee_eleve(%L)', t, m);
  END LOOP;
END $$;