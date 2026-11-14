-- Catalogue de production capturé en lecture seule. Ne jamais appliquer à la base réelle.
DO $$BEGIN CREATE TYPE public.app_role AS ENUM ('admin','moderator','user'); EXCEPTION WHEN duplicate_object THEN NULL; END$$;
-- alertes_systeme (table)
CREATE TABLE public.alertes_systeme (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  type text DEFAULT 'email_error'::text NOT NULL,
  titre text NOT NULL,
  message text NOT NULL,
  details text,
  lu boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.alertes_systeme ADD CONSTRAINT alertes_systeme_pkey PRIMARY KEY (id);
-- apprenant_quiz_results (table)
CREATE TABLE public.apprenant_quiz_results (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  apprenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  quiz_type text DEFAULT 'examen_blanc'::text NOT NULL,
  quiz_id text NOT NULL,
  quiz_titre text NOT NULL,
  matiere_id text,
  matiere_nom text,
  score_obtenu numeric DEFAULT 0 NOT NULL,
  score_max numeric DEFAULT 20 NOT NULL,
  note_sur_20 numeric,
  reussi boolean DEFAULT false,
  details jsonb DEFAULT '{}'::jsonb,
  duree_secondes integer,
  completed_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  tentative integer DEFAULT 1 NOT NULL
);
ALTER TABLE public.apprenant_quiz_results ADD CONSTRAINT unique_apprenant_quiz_matiere_tentative UNIQUE (apprenant_id, quiz_id, matiere_id, tentative);
ALTER TABLE public.apprenant_quiz_results ADD CONSTRAINT apprenant_quiz_results_pkey PRIMARY KEY (id);
-- apprenants (table)
CREATE TABLE public.apprenants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nom text NOT NULL,
  prenom text NOT NULL,
  email text,
  telephone text,
  adresse text,
  code_postal text,
  ville text,
  date_naissance date,
  numero_dossier_cma text,
  statut text DEFAULT 'particulier'::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  mode_financement text DEFAULT 'personnel'::text,
  civilite text,
  organisme_financeur text,
  type_apprenant text,
  formation_choisie text,
  montant_ttc numeric,
  date_debut_formation text,
  date_fin_formation text,
  creneau_horaire text,
  date_examen_theorique text,
  date_formation_catalogue text,
  montant_paye numeric DEFAULT 0,
  moyen_paiement text,
  notes text,
  date_paiement date,
  type_examen text,
  lieu_examen text,
  b2_vierge boolean DEFAULT false,
  resultat_examen text,
  inscrit_france_travail boolean DEFAULT false,
  date_examen_pratique text,
  documents_complets boolean DEFAULT false,
  heure_examen_pratique text,
  resultat_examen_pratique text,
  auth_user_id uuid,
  date_debut_cours_en_ligne date,
  date_fin_cours_en_ligne date,
  modules_autorises integer[],
  mot_de_passe_cma text,
  deleted_at timestamp with time zone,
  societe_nom text,
  societe_siret text,
  societe_tva_intra text,
  societe_adresse text,
  societe_code_postal text,
  societe_ville text,
  facture_contact_nom text,
  facture_contact_email text,
  facture_contact_telephone text,
  responsable_contact_centre boolean DEFAULT false NOT NULL,
  relance_dossier_bienvenue_exclu boolean DEFAULT false NOT NULL,
  heures_elearning numeric,
  heures_presentiel numeric,
  heures_totales numeric,
  heures_pratique numeric,
  source_inscription text DEFAULT 'manuel'::text NOT NULL,
  mot_de_passe_plateforme text,
  emails_bloques boolean DEFAULT false NOT NULL,
  statut_suivi text,
  modalite_formation text,
  frais_examen text,
  abandonnee boolean DEFAULT false NOT NULL,
  date_abandon date,
  identifiant_cma text,
  compte_cours_archive_at timestamp with time zone,
  compte_cours_archive_par uuid,
  date_acceptation_cpf date
);
ALTER TABLE public.apprenants ADD CONSTRAINT apprenants_auth_user_id_key UNIQUE (auth_user_id);
ALTER TABLE public.apprenants ADD CONSTRAINT apprenants_nom_prenom_unique UNIQUE (nom, prenom);
ALTER TABLE public.apprenants ADD CONSTRAINT apprenants_pkey PRIMARY KEY (id);
ALTER TABLE public.apprenants ADD CONSTRAINT apprenants_modalite_formation_check CHECK (((modalite_formation IS NULL) OR (modalite_formation = ANY (ARRAY['presentielle'::text, 'elearning_synchrone'::text, 'elearning_asynchrone'::text]))));
-- bilan_passage_categories (table)
CREATE TABLE public.bilan_passage_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  apprenant_id uuid NOT NULL,
  module_id integer NOT NULL,
  exercice_id integer NOT NULL,
  tentative integer DEFAULT 1 NOT NULL,
  categorie text NOT NULL,
  motif text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.bilan_passage_categories ADD CONSTRAINT bilan_passage_categories_apprenant_id_module_id_exercice_id_key UNIQUE (apprenant_id, module_id, exercice_id, tentative);
ALTER TABLE public.bilan_passage_categories ADD CONSTRAINT bilan_passage_categories_pkey PRIMARY KEY (id);
ALTER TABLE public.bilan_passage_categories ADD CONSTRAINT bilan_passage_categories_categorie_check CHECK ((categorie = ANY (ARRAY['HISTORIQUE'::text, 'VERT'::text, 'ORANGE'::text, 'ROUGE'::text])));
-- bilan_passage_snapshots (table)
CREATE TABLE public.bilan_passage_snapshots (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  apprenant_id uuid NOT NULL,
  module_id integer NOT NULL,
  exercice_id integer NOT NULL,
  filiere text NOT NULL,
  matiere text NOT NULL,
  tentative integer NOT NULL,
  passage_cle text NOT NULL,
  questions jsonb NOT NULL,
  nb_questions integer NOT NULL,
  bareme jsonb,
  empreinte text NOT NULL,
  empreinte_source text NOT NULL,
  operation_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.bilan_passage_snapshots ADD CONSTRAINT bilan_passage_snapshots_apprenant_id_module_id_exercice_id__key UNIQUE (apprenant_id, module_id, exercice_id, tentative);
ALTER TABLE public.bilan_passage_snapshots ADD CONSTRAINT bilan_passage_snapshots_operation_id_key UNIQUE (operation_id);
ALTER TABLE public.bilan_passage_snapshots ADD CONSTRAINT bilan_passage_snapshots_pkey PRIMARY KEY (id);
-- bilan_passages_figes (table)
CREATE TABLE public.bilan_passages_figes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  reponse_apprenant_id uuid NOT NULL,
  apprenant_id uuid,
  module_id integer NOT NULL,
  exercice_id text NOT NULL,
  statut_passage text,
  tentative integer,
  passage_created_at timestamp with time zone,
  passage_updated_at timestamp with time zone,
  reponses jsonb NOT NULL,
  cle_figee jsonb NOT NULL,
  score_bonnes integer NOT NULL,
  nb_repondues integer NOT NULL,
  nb_questions integer NOT NULL,
  empreinte_passage text NOT NULL,
  motif text NOT NULL,
  fige_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.bilan_passages_figes ADD CONSTRAINT bilan_passages_figes_reponse_apprenant_id_key UNIQUE (reponse_apprenant_id);
ALTER TABLE public.bilan_passages_figes ADD CONSTRAINT bilan_passages_figes_pkey PRIMARY KEY (id);
-- bilan_reponse_statuts_effectifs (vue réduite à ses colonnes)
CREATE TABLE public.bilan_reponse_statuts_effectifs (
  id uuid,
  apprenant_id uuid,
  module_id integer,
  exercice_id integer,
  tentative integer,
  cle text,
  uid uuid,
  statut text,
  statut_initial text,
  reclasse boolean,
  reponse jsonb,
  created_at timestamp with time zone
);
-- comptes_test_techniques (table)
CREATE TABLE public.comptes_test_techniques (
  apprenant_id uuid NOT NULL,
  libelle text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.comptes_test_techniques ADD CONSTRAINT comptes_test_techniques_pkey PRIMARY KEY (apprenant_id);
-- donnees_eleves_suppressions (table)
CREATE TABLE public.donnees_eleves_suppressions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  table_nom text NOT NULL,
  apprenant_id uuid,
  ligne jsonb NOT NULL,
  auteur_uid uuid,
  auteur_role text,
  compte_test boolean DEFAULT false NOT NULL,
  motif text,
  alerte_envoyee_at timestamp with time zone
);
ALTER TABLE public.donnees_eleves_suppressions ADD CONSTRAINT donnees_eleves_suppressions_pkey PRIMARY KEY (id);
-- exam_retake_authorizations (table)
CREATE TABLE public.exam_retake_authorizations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  apprenant_id uuid NOT NULL,
  exam_id text NOT NULL,
  motif text DEFAULT 'Nouveau passage autorisé par Admin à la suite d''un passage effectué sur une version erronée'::text NOT NULL,
  result_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
  granted_by uuid,
  granted_email text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  consumed_at timestamp with time zone,
  revoked_at timestamp with time zone,
  reset_id uuid
);
ALTER TABLE public.exam_retake_authorizations ADD CONSTRAINT exam_retake_authorizations_pkey PRIMARY KEY (id);
-- exam_subject_reset_authorizations (table)
CREATE TABLE public.exam_subject_reset_authorizations (
  operation_id uuid NOT NULL,
  apprenant_id uuid NOT NULL,
  exam_id text NOT NULL,
  filiere text NOT NULL,
  matiere_id text NOT NULL,
  source_exercice_id text NOT NULL,
  source_attempt_id uuid,
  source_result_id uuid,
  version_token text NOT NULL,
  source_token text NOT NULL,
  actor uuid NOT NULL,
  learner_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.exam_subject_reset_authorizations ADD CONSTRAINT exam_subject_reset_authorizat_apprenant_id_exam_id_matiere__key UNIQUE (apprenant_id, exam_id, matiere_id, source_token, version_token);
ALTER TABLE public.exam_subject_reset_authorizations ADD CONSTRAINT exam_subject_reset_authorizations_pkey PRIMARY KEY (operation_id);
-- exam_subject_retakes (table)
CREATE TABLE public.exam_subject_retakes (
  operation_id uuid NOT NULL,
  apprenant_id uuid NOT NULL,
  exam_id text NOT NULL,
  matiere_id text NOT NULL,
  source_exercice_id text NOT NULL,
  source_attempt_id uuid,
  attempt_id uuid,
  exercice_id text NOT NULL,
  tentative integer NOT NULL,
  moteur text NOT NULL,
  matiere jsonb NOT NULL,
  authorization_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.exam_subject_retakes ADD CONSTRAINT exam_subject_retakes_apprenant_id_exercice_id_key UNIQUE (apprenant_id, exercice_id);
ALTER TABLE public.exam_subject_retakes ADD CONSTRAINT exam_subject_retakes_pkey PRIMARY KEY (operation_id);
-- quiz_valide_reecritures_refusees (table)
CREATE TABLE public.quiz_valide_reecritures_refusees (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  table_cible text NOT NULL,
  apprenant_id uuid NOT NULL,
  cle text NOT NULL,
  champs text[] DEFAULT '{}'::text[] NOT NULL,
  auteur uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.quiz_valide_reecritures_refusees ADD CONSTRAINT quiz_valide_reecritures_refusees_pkey PRIMARY KEY (id);
-- reponses_apprenants (table)
CREATE TABLE public.reponses_apprenants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  apprenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  exercice_id text NOT NULL,
  exercice_type text DEFAULT 'quiz'::text NOT NULL,
  reponses jsonb DEFAULT '{}'::jsonb NOT NULL,
  score numeric,
  completed boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'in_progress'::text NOT NULL,
  submitted_at timestamp with time zone,
  tentative integer DEFAULT 1 NOT NULL,
  bonnes_reponses integer,
  total_questions integer,
  reponses_meta jsonb DEFAULT '{}'::jsonb NOT NULL,
  write_seq bigint DEFAULT 0 NOT NULL,
  source_noyau text,
  originaux_exacts jsonb DEFAULT '{}'::jsonb NOT NULL
);
ALTER TABLE public.reponses_apprenants ADD CONSTRAINT reponses_apprenants_apprenant_id_exercice_id_key UNIQUE (apprenant_id, exercice_id);
ALTER TABLE public.reponses_apprenants ADD CONSTRAINT reponses_apprenants_pkey PRIMARY KEY (id);
ALTER TABLE public.reponses_apprenants ADD CONSTRAINT reponses_apprenants_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'submitted'::text])));
-- reponses_apprenants_historique (table)
CREATE TABLE public.reponses_apprenants_historique (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  apprenant_id uuid NOT NULL,
  user_id uuid,
  exercice_id text NOT NULL,
  exercice_type text NOT NULL,
  tentative integer DEFAULT 1 NOT NULL,
  reponses jsonb DEFAULT '{}'::jsonb NOT NULL,
  score numeric,
  bonnes_reponses integer,
  total_questions integer,
  status text DEFAULT 'submitted'::text NOT NULL,
  submitted_at timestamp with time zone,
  archived_at timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.reponses_apprenants_historique ADD CONSTRAINT reponses_apprenants_historique_pkey PRIMARY KEY (id);
-- reponses_apprenants_journal (table)
CREATE TABLE public.reponses_apprenants_journal (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  apprenant_id uuid NOT NULL,
  user_id uuid,
  module_id integer,
  exercice_id text NOT NULL,
  exercice_type text DEFAULT 'quiz'::text NOT NULL,
  question_id text NOT NULL,
  valeur jsonb DEFAULT '[]'::jsonb NOT NULL,
  tentative integer DEFAULT 1 NOT NULL,
  client_saved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  event_id uuid DEFAULT gen_random_uuid() NOT NULL,
  valeur_originale jsonb
);
ALTER TABLE public.reponses_apprenants_journal ADD CONSTRAINT reponses_apprenants_journal_pkey PRIMARY KEY (id);
-- user_roles (table)
CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
CREATE OR REPLACE FUNCTION public.bilan_corriger_snapshot(p_snapshot_id uuid, p_reponses jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT x->>'uid' uid, x->'choix' choix FROM bilan_passage_snapshots s, jsonb_array_elements(s.questions) x
    WHERE s.id = p_snapshot_id AND x->>'type' = 'QCM' AND x->>'uid' IS NOT NULL),
  c AS (
    SELECT q.uid,
      (SELECT COALESCE(array_agg(ch->>'lettre' ORDER BY ch->>'lettre'), '{}') FROM jsonb_array_elements(q.choix) ch WHERE (ch->>'correct')::boolean) bonnes,
      (SELECT COALESCE(array_agg(v ORDER BY v), '{}') FROM jsonb_array_elements_text(COALESCE(p_reponses->q.uid,'[]'::jsonb)) v) donnees
    FROM q)
  SELECT jsonb_build_object('bonnes', count(*) FILTER (WHERE bonnes = donnees AND cardinality(donnees) > 0), 'total', count(*),
    'reponses_hors_snapshot', (SELECT count(*) FROM jsonb_object_keys(p_reponses) k WHERE k NOT IN (SELECT uid FROM q)))
  FROM c
$function$;
REVOKE ALL ON FUNCTION public.bilan_corriger_snapshot(p_snapshot_id uuid, p_reponses jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bilan_corriger_snapshot(p_snapshot_id uuid, p_reponses jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.bilan_corriger_snapshot(p_snapshot_id uuid, p_reponses jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.bilan_corriger_snapshot(p_snapshot_id uuid, p_reponses jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bilan_corriger_snapshot(p_snapshot_id uuid, p_reponses jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.bilan_garde_passage_rouge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE m text[];
BEGIN
  m := regexp_match(OLD.exercice_id, '^module_(5|11)_exo_(\d+)$');
  IF m IS NULL THEN RETURN NEW; END IF;
  IF length(m[2]) > 9 THEN RETURN NEW; END IF;
  IF COALESCE(NEW.tentative, OLD.tentative) <> COALESCE(OLD.tentative, 1) THEN
    IF current_setting('app.bilan_rouge_ouverture', true) = '1' THEN RETURN NEW; END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM bilan_passage_categories c
                 WHERE c.apprenant_id = OLD.apprenant_id AND c.module_id = m[1]::int AND c.exercice_id = m[2]::int
                   AND c.tentative = COALESCE(OLD.tentative, 1) AND c.categorie = 'ROUGE') THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF current_setting('app.bilan_rouge_ouverture', true) = '1' THEN RETURN NEW; END IF;
  IF NEW.reponses IS DISTINCT FROM OLD.reponses OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.completed IS DISTINCT FROM OLD.completed OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.tentative IS DISTINCT FROM OLD.tentative THEN
    RAISE EXCEPTION 'Ancien passage conservé : nouvelle tentative à autoriser par l''Admin' USING ERRCODE = 'P0499';
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.bilan_garde_reponses_verrouillees()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE m text[]; r record;
BEGIN
  m := regexp_match(NEW.exercice_id, '^module_(\d+)_exo_(\d+)$');
  IF m IS NULL THEN RETURN NEW; END IF;
  -- Identifiants techniques longs (> integer) : ne peuvent correspondre à aucun statut Bilan.
  IF length(m[1]) > 9 OR length(m[2]) > 9 THEN RETURN NEW; END IF;
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
CREATE OR REPLACE FUNCTION public.bilan_snapshot_immuable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'Snapshot de passage Bilan immuable : % refusé.', TG_OP USING ERRCODE = 'P0491';
END $function$;
CREATE OR REPLACE FUNCTION public.core_est_proprietaire(p_apprenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = p_apprenant_id AND a.auth_user_id = auth.uid());
$function$;
REVOKE ALL ON FUNCTION public.core_est_proprietaire(p_apprenant_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.core_est_proprietaire(p_apprenant_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.core_est_proprietaire(p_apprenant_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.core_est_proprietaire(p_apprenant_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.core_est_proprietaire(p_apprenant_id uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.eb_reponses_renseignees(_r jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    jsonb_typeof(_r) = 'object'
    AND jsonb_path_exists(
      _r,
      'strict $.** ? ((@.type() == "string" && @ like_regex "\\S") || @.type() == "number" || @.type() == "boolean")'
    ),
    false)
$function$;
REVOKE ALL ON FUNCTION public.eb_reponses_renseignees(_r jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_reponses_renseignees(_r jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_reponses_renseignees(_r jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.eb_reponses_renseignees(_r jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_reponses_renseignees(_r jsonb) TO service_role;
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
  v_total_matieres integer;
  v_matieres_prec integer;
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

  -- Dedicated admin grant applies to ONE receipt/subject/account, never the global path.
  IF EXISTS (SELECT 1 FROM public.exam_subject_retakes r
    JOIN public.exam_subject_reset_authorizations a ON a.operation_id=r.authorization_id
    WHERE r.apprenant_id=NEW.apprenant_id AND r.exercice_id=NEW.exercice_id
      AND r.tentative=v_tent AND a.apprenant_id=r.apprenant_id AND a.exam_id=r.exam_id
      AND a.matiere_id=r.matiere_id AND a.source_exercice_id=r.source_exercice_id
      AND public.core_est_proprietaire(r.apprenant_id)) THEN RETURN NEW; END IF;

  -- Tentative déjà ouverte (une autre matière du même passage existe) : jamais bloquée
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

  -- Nombre de matières que comporte cet examen (observé en base, lecture seule)
  SELECT COUNT(DISTINCT split_part(COALESCE(r.exercice_id, ''), '__', 2))
    INTO v_total_matieres
  FROM public.reponses_apprenants r
  WHERE r.exercice_type = 'examen_blanc'
    AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
    AND split_part(COALESCE(r.exercice_id, ''), '__', 2) <> '';

  -- Matières réellement finalisées par l'apprenant sur les tentatives précédentes
  SELECT COUNT(DISTINCT split_part(COALESCE(r.exercice_id, ''), '__', 2))
    INTO v_matieres_prec
  FROM public.reponses_apprenants r
  WHERE r.apprenant_id = NEW.apprenant_id
    AND r.exercice_type = 'examen_blanc'
    AND split_part(COALESCE(r.exercice_id, ''), '__', 1) = v_exam
    AND r.completed IS TRUE
    AND split_part(COALESCE(r.exercice_id, ''), '__', 2) <> '';

  -- Tentative précédente incomplète : l'apprenant est encore dans son passage, aucun délai
  IF COALESCE(v_total_matieres, 0) = 0
     OR COALESCE(v_matieres_prec, 0) < v_total_matieres THEN
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
CREATE OR REPLACE FUNCTION public.ensure_quiz_result_on_matiere_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quiz_id text;
  v_matiere_raw text;
  v_matiere text;
  v_tentative integer := 1;
  v_exists boolean;
  v_apprenant_exists boolean;
  m text[];
  t text[];
  v_retake_tentative integer;
BEGIN
  IF NEW.exercice_type IS DISTINCT FROM 'examen_blanc' THEN
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.completed, false) <> true THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.completed, false) = true THEN
    RETURN NEW;
  END IF;

  m := regexp_match(NEW.exercice_id, '^((?:EB|eb)\d+(?:-[a-zA-Z0-9]+)?|bilan-[^_]+)_+(.+)$');
  IF m IS NULL THEN
    INSERT INTO public.alertes_systeme (type, titre, message, details)
    VALUES (
      'exam_result_missing',
      'Format exercice_id inconnu (examen blanc)',
      'Impossible de rattacher la matière terminée pour exercice_id=' || NEW.exercice_id,
      jsonb_build_object(
        'apprenant_id', NEW.apprenant_id,
        'exercice_id', NEW.exercice_id,
        'user_id', NEW.user_id
      )::text
    );
    RETURN NEW;
  END IF;

  v_quiz_id := m[1];
  v_matiere_raw := m[2];

  t := regexp_match(v_matiere_raw, '^(.+?)_+t(\d+)$');
  IF t IS NOT NULL THEN
    v_matiere := t[1];
    v_tentative := GREATEST(1, t[2]::integer);
  ELSE
    v_matiere := v_matiere_raw;
    v_tentative := 1;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.apprenants WHERE id = NEW.apprenant_id) INTO v_apprenant_exists;
  IF NOT v_apprenant_exists THEN
    RETURN NEW;
  END IF;

  -- Additive: an explicit subject-retake receipt binds this copy to ONE exact tentative.
  -- Earlier tentatives are never touched; legacy copies without receipt keep the code below.
  SELECT r.tentative INTO v_retake_tentative FROM public.exam_subject_retakes r
   WHERE r.apprenant_id = NEW.apprenant_id AND r.exercice_id = NEW.exercice_id;
  IF FOUND THEN
    UPDATE public.apprenant_quiz_results
       SET details = COALESCE(details, '{}'::jsonb)
                     || jsonb_build_object(
                          'auto_ensured_at', now(),
                          'source_exercice_id', NEW.exercice_id,
                          'source_tentative', v_retake_tentative,
                          'last_raw_reponses', COALESCE(NEW.reponses, '{}'::jsonb)
                        )
     WHERE apprenant_id = NEW.apprenant_id
       AND quiz_id = v_quiz_id
       AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
       AND tentative = v_retake_tentative;
    IF NOT FOUND THEN
      INSERT INTO public.alertes_systeme (type, titre, message, details)
      VALUES ('exam_result_missing',
        'Matière refaite terminée sans note enregistrée (finalisation en attente)',
        'Les réponses sont conservées pour ' || NEW.exercice_id || ' : aucune autre tentative n''a été modifiée.',
        jsonb_build_object('apprenant_id', NEW.apprenant_id, 'quiz_id', v_quiz_id, 'matiere_id', v_matiere,
          'tentative', v_retake_tentative, 'exercice_id', NEW.exercice_id)::text);
    END IF;
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.apprenant_quiz_results
    WHERE apprenant_id = NEW.apprenant_id
      AND quiz_id = v_quiz_id
      AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
  ) INTO v_exists;

  IF v_exists THEN
    -- Une note existe déjà : on ne touche ni au score, ni aux corrections.
    UPDATE public.apprenant_quiz_results
       SET details = COALESCE(details, '{}'::jsonb)
                     || jsonb_build_object(
                          'auto_ensured_at', now(),
                          'source_exercice_id', NEW.exercice_id,
                          'source_tentative', v_tentative,
                          'last_raw_reponses', COALESCE(NEW.reponses, '{}'::jsonb)
                        )
     WHERE apprenant_id = NEW.apprenant_id
       AND quiz_id = v_quiz_id
       AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
       AND tentative = (
         SELECT MAX(tentative) FROM public.apprenant_quiz_results
         WHERE apprenant_id = NEW.apprenant_id
           AND quiz_id = v_quiz_id
           AND COALESCE(matiere_id, '') = COALESCE(v_matiere, '')
       );
    RETURN NEW;
  END IF;

  -- Aucune note écrite : on signale, on ne crée AUCUN résultat à 0.
  INSERT INTO public.alertes_systeme (type, titre, message, details)
  VALUES (
    'exam_result_missing',
    'Matière terminée sans note enregistrée (finalisation en attente)',
    'Les réponses sont conservées pour ' || NEW.exercice_id || ' : la note doit être recalculée, aucun 0 n''a été enregistré.',
    jsonb_build_object(
      'apprenant_id', NEW.apprenant_id,
      'user_id', NEW.user_id,
      'quiz_id', v_quiz_id,
      'matiere_id', v_matiere,
      'tentative', v_tentative,
      'exercice_id', NEW.exercice_id,
      'raw_reponses', COALESCE(NEW.reponses, '{}'::jsonb)
    )::text
  );

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.est_compte_test(_apprenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.comptes_test_techniques t WHERE t.apprenant_id = _apprenant_id);
$function$;
REVOKE ALL ON FUNCTION public.est_compte_test(_apprenant_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.est_compte_test(_apprenant_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.est_compte_test(_apprenant_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.est_compte_test(_apprenant_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.est_compte_test(_apprenant_id uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.garde_activites_taxi_2026_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE champs text[]; k text;
BEGIN
  IF NEW.exercice_id NOT IN ('jeu_taxi_2026_feries_v1','jeu_taxi_2026_tarifs_v1','jeu_taxi_2026_rtst_v1') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.completed IS TRUE AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Activité TAXI déjà validée : preuve conservée' USING ERRCODE='42501';
  END IF;
  IF NEW.score IS NOT NULL THEN RAISE EXCEPTION 'Activités TAXI non notées' USING ERRCODE='23514'; END IF;
  IF NEW.reponses->>'version' IS DISTINCT FROM '2026-v1' OR jsonb_typeof(NEW.reponses->'valeurs') IS DISTINCT FROM 'object'
    OR coalesce(NEW.reponses->>'revision','')='' THEN
    RAISE EXCEPTION 'Version ou identité de saisie TAXI manquante' USING ERRCODE='23514';
  END IF;
  IF NEW.completed IS TRUE THEN
    IF NEW.exercice_id='jeu_taxi_2026_feries_v1' THEN
      SELECT array_agg('f'||lpad(n::text,2,'0')) INTO champs FROM generate_series(1,11) n;
    ELSIF NEW.exercice_id='jeu_taxi_2026_tarifs_v1' THEN
      SELECT array_agg('t'||lpad(n::text,2,'0')) INTO champs FROM generate_series(1,30) n;
    ELSE
      SELECT array_agg('s'||lpad(n::text,2,'0')||'_'||c) INTO champs FROM generate_series(1,13) n CROSS JOIN unnest(ARRAY['r','tarif','s','attente']) c;
    END IF;
    FOREACH k IN ARRAY champs LOOP
      IF jsonb_typeof(NEW.reponses->'valeurs'->k) IS DISTINCT FROM 'string' OR btrim(coalesce(NEW.reponses->'valeurs'->>k,''))='' THEN
        RAISE EXCEPTION 'Activité TAXI incomplète : %',k USING ERRCODE='23514';
      END IF;
      IF NEW.exercice_id='jeu_taxi_2026_tarifs_v1' AND NEW.reponses->'valeurs'->>k !~ '^[0-3]$' THEN
        RAISE EXCEPTION 'Choix TAXI invalide' USING ERRCODE='23514';
      END IF;
      IF NEW.exercice_id='jeu_taxi_2026_feries_v1' AND NEW.reponses->'valeurs'->>k !~ '^2026-[0-9]{2}-[0-9]{2}$' THEN
        RAISE EXCEPTION 'Date TAXI invalide' USING ERRCODE='23514';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.garde_cas_pratique_feries()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ DECLARE k text; n int; BEGIN IF NEW.exercice_id <> 'quiz_cas_pratique_feries_2026_v1' THEN RETURN NEW; END IF; IF TG_OP='UPDATE' AND OLD.completed IS TRUE AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Quiz terminé : preuve conservée' USING ERRCODE='42501'; END IF; IF NEW.score IS NOT NULL OR NEW.reponses->>'version' IS DISTINCT FROM '2026-10-29-m12-feries-v1' OR jsonb_typeof(NEW.reponses->'valeurs') IS DISTINCT FROM 'object' OR coalesce(NEW.reponses->>'revision','')='' THEN RAISE EXCEPTION 'Identité de quiz invalide' USING ERRCODE='23514'; END IF; IF NEW.completed IS TRUE THEN FOR n IN 1..11 LOOP k := 'f'||lpad(n::text,2,'0'); IF jsonb_typeof(NEW.reponses->'valeurs'->k) IS DISTINCT FROM 'string' OR NEW.reponses->'valeurs'->>k !~ '^[0-2]$' THEN RAISE EXCEPTION 'Quiz jours fériés incomplet : %', k USING ERRCODE='23514'; END IF; END LOOP; END IF; RETURN NEW; END $function$;
CREATE OR REPLACE FUNCTION public.garde_donnee_eleve()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END $function$;
CREATE OR REPLACE FUNCTION public.garde_eb_legacy_cloture_vide()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_terminal boolean := (COALESCE(NEW.completed, false) OR NEW.status = 'submitted');
BEGIN
  -- Portée exacte : examens blancs legacy (le nouveau moteur n'écrit pas ici).
  IF NEW.exercice_type IS DISTINCT FROM 'examen_blanc' OR NEW.source_noyau IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NOT v_terminal OR public.eb_reponses_renseignees(NEW.reponses) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Ligne déjà terminée (historique) : jamais bloquée ici.
    IF COALESCE(OLD.completed, false) OR OLD.status = 'submitted' THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'Clôture refusée : examen blanc % sans aucune réponse enregistrée. Rechargez normalement la page et attendez le chargement de vos réponses ; aucune donnée n''est supprimée.', NEW.exercice_id
    USING ERRCODE = 'P0530',
          HINT = 'EB_CLOTURE_VIDE_REFUSEE';
END;
$function$;
CREATE OR REPLACE FUNCTION public.garde_passage_bilan_fige()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.bilan_passages_figes f
                 WHERE f.reponse_apprenant_id = OLD.id AND f.tentative = OLD.tentative) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PASSAGE_FIGE: passage archivé, suppression interdite' USING ERRCODE = 'P0490';
  END IF;
  -- Nouvelle tentative distincte : uniquement sur décision admin (ou serveur)
  IF COALESCE(NEW.tentative, OLD.tentative) > OLD.tentative THEN
    IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'PASSAGE_FIGE: nouvelle tentative réservée à un administrateur' USING ERRCODE = 'P0490';
  END IF;
  IF NEW.reponses IS DISTINCT FROM OLD.reponses
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.completed IS DISTINCT FROM OLD.completed
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.bonnes_reponses IS DISTINCT FROM OLD.bonnes_reponses
     OR NEW.total_questions IS DISTINCT FROM OLD.total_questions
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    RAISE EXCEPTION 'PASSAGE_FIGE: passage archivé, aucune nouvelle réponse acceptée' USING ERRCODE = 'P0490';
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.garde_quiz_equipements_m64_sanctions_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE k text; n int;
BEGIN
  IF NEW.exercice_id <> 'quiz_taxi_equipements_m64_sanctions_v1' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.completed IS TRUE AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Questions Équipements TAXI (sanctions) déjà terminées : preuve conservée' USING ERRCODE='42501';
  END IF;
  IF NEW.score IS NOT NULL THEN RAISE EXCEPTION 'Questions complémentaires non notées' USING ERRCODE='23514'; END IF;
  IF NEW.reponses->>'version' IS DISTINCT FROM '2026-10-27-m64-sanctions-v1' OR jsonb_typeof(NEW.reponses->'valeurs') IS DISTINCT FROM 'object'
    OR coalesce(NEW.reponses->>'revision','')='' THEN
    RAISE EXCEPTION 'Version ou identité de saisie manquante' USING ERRCODE='23514';
  END IF;
  IF NEW.completed IS TRUE THEN
    FOR n IN 1..20 LOOP
      k := 'q'||lpad(n::text,2,'0');
      IF jsonb_typeof(NEW.reponses->'valeurs'->k) IS DISTINCT FROM 'string' OR NEW.reponses->'valeurs'->>k !~ '^[0-2]$' THEN
        RAISE EXCEPTION 'Questions Équipements TAXI (sanctions) incomplètes : %', k USING ERRCODE='23514';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.garde_quiz_equipements_m64_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE k text; n int;
BEGIN
  IF NEW.exercice_id <> 'quiz_taxi_equipements_m64_complement_v1' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.completed IS TRUE AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Questions complémentaires Équipements TAXI déjà terminées : preuve conservée' USING ERRCODE='42501';
  END IF;
  IF NEW.score IS NOT NULL THEN RAISE EXCEPTION 'Questions complémentaires non notées' USING ERRCODE='23514'; END IF;
  IF NEW.reponses->>'version' IS DISTINCT FROM '2026-10-27-m64-v1' OR jsonb_typeof(NEW.reponses->'valeurs') IS DISTINCT FROM 'object'
    OR coalesce(NEW.reponses->>'revision','')='' THEN
    RAISE EXCEPTION 'Version ou identité de saisie manquante' USING ERRCODE='23514';
  END IF;
  IF NEW.completed IS TRUE THEN
    FOR n IN 1..11 LOOP
      k := 'q'||lpad(n::text,2,'0');
      IF jsonb_typeof(NEW.reponses->'valeurs'->k) IS DISTINCT FROM 'string'
        OR NEW.reponses->'valeurs'->>k !~ '^[0-2]$' THEN
        RAISE EXCEPTION 'Questions complémentaires incomplètes : %', k USING ERRCODE='23514';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.garde_quiz_equipements_taxi_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE k text; nb int[] := ARRAY[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3]; n int;
BEGIN
  IF NEW.exercice_id <> 'quiz_taxi_locale_equipements_v1' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.completed IS TRUE AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Quiz Équipements TAXI déjà terminé : preuve conservée' USING ERRCODE='42501';
  END IF;
  IF NEW.score IS NOT NULL THEN RAISE EXCEPTION 'Quiz Équipements TAXI non noté' USING ERRCODE='23514'; END IF;
  IF NEW.reponses->>'version' IS DISTINCT FROM '2026-10-27-v1' OR jsonb_typeof(NEW.reponses->'valeurs') IS DISTINCT FROM 'object'
    OR coalesce(NEW.reponses->>'revision','')='' THEN
    RAISE EXCEPTION 'Version ou identité de saisie manquante' USING ERRCODE='23514';
  END IF;
  IF NEW.completed IS TRUE THEN
    FOR n IN 1..15 LOOP
      k := 'q'||lpad(n::text,2,'0');
      IF jsonb_typeof(NEW.reponses->'valeurs'->k) IS DISTINCT FROM 'string'
        OR NEW.reponses->'valeurs'->>k !~ '^[0-9]$'
        OR (NEW.reponses->'valeurs'->>k)::int >= nb[n] THEN
        RAISE EXCEPTION 'Quiz Équipements TAXI incomplet : %', k USING ERRCODE='23514';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.garde_quiz_module_valide()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_champs text[] := '{}';
BEGIN
  IF OLD.status IS DISTINCT FROM 'submitted'
     OR OLD.exercice_id !~ '^module_[0-9]+_exo_[0-9]+$'
     OR COALESCE(NEW.tentative, OLD.tentative) > OLD.tentative
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.reponses IS DISTINCT FROM OLD.reponses AND NEW.reponses IS NOT NULL AND NEW.reponses <> '{}'::jsonb THEN
    v_champs := array_append(v_champs, 'reponses');
    INSERT INTO public.reponses_apprenants_historique (apprenant_id, user_id, exercice_id, exercice_type, tentative,
      reponses, score, bonnes_reponses, total_questions, status, submitted_at)
    VALUES (OLD.apprenant_id, NEW.user_id, OLD.exercice_id, OLD.exercice_type, OLD.tentative,
      NEW.reponses, NEW.score, NEW.bonnes_reponses, NEW.total_questions, 'reecriture_refusee', NULL);
  END IF;
  IF NEW.score IS DISTINCT FROM OLD.score THEN v_champs := array_append(v_champs, 'score'); END IF;
  IF NEW.bonnes_reponses IS DISTINCT FROM OLD.bonnes_reponses THEN v_champs := array_append(v_champs, 'bonnes_reponses'); END IF;
  IF NEW.total_questions IS DISTINCT FROM OLD.total_questions THEN v_champs := array_append(v_champs, 'total_questions'); END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN v_champs := array_append(v_champs, 'status'); END IF;
  IF NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN v_champs := array_append(v_champs, 'submitted_at'); END IF;
  IF NEW.completed IS DISTINCT FROM OLD.completed THEN v_champs := array_append(v_champs, 'completed'); END IF;
  NEW.reponses := OLD.reponses; NEW.score := OLD.score; NEW.bonnes_reponses := OLD.bonnes_reponses;
  NEW.total_questions := OLD.total_questions; NEW.status := OLD.status; NEW.submitted_at := OLD.submitted_at;
  NEW.completed := OLD.completed; NEW.tentative := OLD.tentative;
  IF array_length(v_champs, 1) > 0 THEN
    INSERT INTO public.quiz_valide_reecritures_refusees (table_cible, apprenant_id, cle, champs, auteur)
    VALUES ('reponses_apprenants', OLD.apprenant_id, OLD.exercice_id, v_champs, auth.uid());
  END IF;
  RETURN NEW;
END; $function$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;
REVOKE ALL ON FUNCTION public.has_role(_user_id uuid, _role app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;
CREATE OR REPLACE FUNCTION public.persist_answer_batch_v2(p_apprenant_id uuid, p_user_id uuid, p_module_id integer, p_exercice_id text, p_exercice_type text, p_reponses jsonb, p_completed boolean, p_score numeric, p_base_seq bigint, p_events jsonb)
 RETURNS TABLE(saved boolean, stored_reponses jsonb, stored_tentative integer, stored_updated_at timestamp with time zone, stored_write_seq bigint, frozen boolean, skipped_questions text[], accepted_event_ids uuid[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current public.reponses_apprenants%ROWTYPE;
  v_tentative integer := 1;
  v_accepted uuid[] := ARRAY[]::uuid[];
  v_skipped text[] := ARRAY[]::text[];
  v_event jsonb;
  v_event_id uuid;
  v_base bigint := GREATEST(COALESCE(p_base_seq, 0), 0);
  v_next_seq bigint;
  v_merged jsonb;
  v_meta jsonb;
  v_key text;
  v_value jsonb;
  v_stored_seq bigint;
  v_frozen boolean := false;
  v_applied boolean := false;
BEGIN
  SELECT * INTO v_current
  FROM public.reponses_apprenants
  WHERE apprenant_id = p_apprenant_id
    AND exercice_id = p_exercice_id
  FOR UPDATE;

  IF FOUND THEN
    v_tentative := COALESCE(v_current.tentative, 1);

    -- Tentative définitivement terminée : figée. Une réponse restée dans la
    -- file hors connexion ne peut plus la modifier (elle reste journalisée).
    IF v_current.status = 'submitted' OR v_current.completed = true THEN
      v_frozen := true;
    ELSE
      v_next_seq := COALESCE(v_current.write_seq, 0) + 1;
      v_merged := COALESCE(v_current.reponses, '{}'::jsonb);
      v_meta := COALESCE(v_current.reponses_meta, '{}'::jsonb);

      FOR v_key, v_value IN
        SELECT key, value FROM jsonb_each(COALESCE(p_reponses, '{}'::jsonb))
      LOOP
        v_stored_seq := NULLIF(v_meta -> v_key ->> 'seq', '')::bigint;
        IF v_stored_seq IS NULL OR v_stored_seq <= v_base THEN
          v_merged := jsonb_set(v_merged, ARRAY[v_key], v_value, true);
          v_meta := jsonb_set(
            v_meta,
            ARRAY[v_key],
            jsonb_build_object('seq', v_next_seq, 'at', to_jsonb(now())),
            true
          );
          v_applied := true;
        ELSE
          -- Une écriture plus récente existe déjà pour cette question :
          -- la valeur ancienne est ignorée (jamais d'écrasement à rebours).
          v_skipped := array_append(v_skipped, v_key);
        END IF;
      END LOOP;

      IF v_applied OR COALESCE(p_completed, false) OR p_score IS NOT NULL THEN
        UPDATE public.reponses_apprenants
        SET user_id = COALESCE(p_user_id, user_id),
            exercice_type = p_exercice_type,
            reponses = v_merged,
            reponses_meta = v_meta,
            write_seq = v_next_seq,
            completed = v_current.completed OR COALESCE(p_completed, false),
            score = CASE WHEN p_score IS NULL THEN v_current.score ELSE p_score END,
            updated_at = now()
        WHERE id = v_current.id
        RETURNING * INTO v_current;
      END IF;
    END IF;
  ELSE
    v_merged := COALESCE(p_reponses, '{}'::jsonb);
    v_meta := '{}'::jsonb;
    FOR v_key IN SELECT key FROM jsonb_each(v_merged)
    LOOP
      v_meta := jsonb_set(
        v_meta, ARRAY[v_key],
        jsonb_build_object('seq', 1, 'at', to_jsonb(now())), true
      );
    END LOOP;

    INSERT INTO public.reponses_apprenants (
      apprenant_id, user_id, exercice_id, exercice_type, reponses,
      reponses_meta, write_seq, completed, score, updated_at
    ) VALUES (
      p_apprenant_id, p_user_id, p_exercice_id, p_exercice_type,
      v_merged, v_meta, 1, COALESCE(p_completed, false), p_score, now()
    )
    RETURNING * INTO v_current;
    v_tentative := COALESCE(v_current.tentative, 1);
  END IF;

  -- Journal append-only : toujours alimenté, y compris pour une écriture
  -- ignorée ou une tentative figée (traçabilité complète).
  IF jsonb_typeof(COALESCE(p_events, '[]'::jsonb)) = 'array' THEN
    FOR v_event IN SELECT value FROM jsonb_array_elements(COALESCE(p_events, '[]'::jsonb))
    LOOP
      IF NULLIF(v_event->>'question_id', '') IS NULL THEN
        CONTINUE;
      END IF;
      BEGIN
        v_event_id := COALESCE(NULLIF(v_event->>'event_id', '')::uuid, gen_random_uuid());
      EXCEPTION WHEN invalid_text_representation THEN
        v_event_id := gen_random_uuid();
      END;

      INSERT INTO public.reponses_apprenants_journal (
        event_id, apprenant_id, user_id, module_id, exercice_id,
        exercice_type, question_id, valeur, tentative, client_saved_at
      ) VALUES (
        v_event_id, p_apprenant_id, p_user_id, p_module_id, p_exercice_id,
        p_exercice_type, v_event->>'question_id', COALESCE(v_event->'valeur', 'null'::jsonb),
        COALESCE(NULLIF(v_event->>'tentative', '')::integer, v_tentative),
        NULLIF(v_event->>'client_saved_at', '')::timestamptz
      )
      ON CONFLICT (event_id) DO NOTHING;

      v_accepted := array_append(v_accepted, v_event_id);
    END LOOP;
  END IF;

  RETURN QUERY SELECT
    true,
    v_current.reponses,
    COALESCE(v_current.tentative, v_tentative),
    v_current.updated_at,
    COALESCE(v_current.write_seq, 0),
    v_frozen,
    v_skipped,
    v_accepted;
END;
$function$;
REVOKE ALL ON FUNCTION public.persist_answer_batch_v2(p_apprenant_id uuid, p_user_id uuid, p_module_id integer, p_exercice_id text, p_exercice_type text, p_reponses jsonb, p_completed boolean, p_score numeric, p_base_seq bigint, p_events jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.persist_answer_batch_v2(p_apprenant_id uuid, p_user_id uuid, p_module_id integer, p_exercice_id text, p_exercice_type text, p_reponses jsonb, p_completed boolean, p_score numeric, p_base_seq bigint, p_events jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.protect_reponses_apprenants_journal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'Le journal des reponses apprenants est en ecriture seule (append-only)';
END;
$function$;
CREATE OR REPLACE FUNCTION public.protect_reponses_apprenants_terminal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.completed = true AND NEW.status <> 'submitted' THEN
      NEW.status := 'submitted';
    END IF;
    IF NEW.status = 'submitted' THEN
      NEW.completed := true;
      NEW.submitted_at := COALESCE(NEW.submitted_at, now());
    END IF;
    RETURN NEW;
  END IF;

  -- Nouvelle tentative explicitement demandée : archiver puis repartir à zéro
  IF COALESCE(NEW.tentative, OLD.tentative) > OLD.tentative THEN
    IF OLD.status = 'submitted' THEN
      INSERT INTO public.reponses_apprenants_historique (
        apprenant_id, user_id, exercice_id, exercice_type, tentative,
        reponses, score, bonnes_reponses, total_questions, status, submitted_at
      ) VALUES (
        OLD.apprenant_id, OLD.user_id, OLD.exercice_id, OLD.exercice_type, OLD.tentative,
        OLD.reponses, OLD.score, OLD.bonnes_reponses, OLD.total_questions, OLD.status, OLD.submitted_at
      );
    END IF;
    NEW.status := 'in_progress';
    NEW.completed := false;
    NEW.submitted_at := NULL;
    NEW.score := NULL;
    NEW.bonnes_reponses := NULL;
    NEW.total_questions := NULL;
    NEW.reponses := '{}'::jsonb;
    RETURN NEW;
  END IF;

  IF OLD.status = 'submitted' THEN
    NEW.status := 'submitted';
    NEW.completed := true;
    NEW.submitted_at := COALESCE(NEW.submitted_at, OLD.submitted_at, now());
    NEW.score := COALESCE(NEW.score, OLD.score);
    NEW.bonnes_reponses := COALESCE(NEW.bonnes_reponses, OLD.bonnes_reponses);
    NEW.total_questions := COALESCE(NEW.total_questions, OLD.total_questions);
    NEW.tentative := GREATEST(COALESCE(NEW.tentative, 1), OLD.tentative);
    IF NEW.reponses IS NULL OR NEW.reponses = '{}'::jsonb THEN
      NEW.reponses := OLD.reponses;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.completed = true AND NEW.status <> 'submitted' THEN
    NEW.status := 'submitted';
  END IF;
  IF NEW.status = 'submitted' THEN
    NEW.completed := true;
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
  END IF;
  NEW.tentative := GREATEST(COALESCE(NEW.tentative, 1), OLD.tentative);
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(_apprenant_id uuid, _exercice_id text, _exercice_type text, _reponses jsonb, _score numeric DEFAULT NULL::numeric, _bonnes_reponses integer DEFAULT NULL::integer, _total_questions integer DEFAULT NULL::integer)
 RETURNS reponses_apprenants
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row public.reponses_apprenants;
  _is_owner boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = _apprenant_id AND a.auth_user_id = auth.uid()
  ) INTO _is_owner;

  IF NOT _is_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  INSERT INTO public.reponses_apprenants AS r (
    apprenant_id, user_id, exercice_id, exercice_type,
    reponses, score, bonnes_reponses, total_questions,
    completed, status, submitted_at, updated_at
  ) VALUES (
    _apprenant_id, COALESCE(auth.uid(), _apprenant_id), _exercice_id, _exercice_type,
    COALESCE(_reponses, '{}'::jsonb), _score, _bonnes_reponses, _total_questions,
    true, 'submitted', now(), now()
  )
  ON CONFLICT (apprenant_id, exercice_id) DO UPDATE SET
    exercice_type = EXCLUDED.exercice_type,
    reponses = CASE WHEN EXCLUDED.reponses = '{}'::jsonb THEN r.reponses ELSE EXCLUDED.reponses END,
    score = COALESCE(EXCLUDED.score, r.score),
    bonnes_reponses = COALESCE(EXCLUDED.bonnes_reponses, r.bonnes_reponses),
    total_questions = COALESCE(EXCLUDED.total_questions, r.total_questions),
    completed = true,
    status = 'submitted',
    submitted_at = COALESCE(r.submitted_at, now()),
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$function$;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(_apprenant_id uuid, _exercice_id text, _exercice_type text, _reponses jsonb, _score numeric, _bonnes_reponses integer, _total_questions integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(_apprenant_id uuid, _exercice_id text, _exercice_type text, _reponses jsonb, _score numeric, _bonnes_reponses integer, _total_questions integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(_apprenant_id uuid, _exercice_id text, _exercice_type text, _reponses jsonb, _score numeric, _bonnes_reponses integer, _total_questions integer) TO service_role;
CREATE TRIGGER trg_00_garde_quiz_module_valide BEFORE UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION garde_quiz_module_valide();
CREATE TRIGGER trg_0_garde_passage_bilan_fige BEFORE DELETE OR UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION garde_passage_bilan_fige();
CREATE TRIGGER trg_0b_bilan_reponses_verrouillees BEFORE INSERT OR UPDATE OF reponses ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION bilan_garde_reponses_verrouillees();
CREATE TRIGGER trg_0c_bilan_garde_passage_rouge BEFORE UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION bilan_garde_passage_rouge();
CREATE TRIGGER trg_enforce_exam_retake_delay BEFORE INSERT ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION enforce_exam_retake_delay();
CREATE TRIGGER trg_ensure_quiz_result_on_matiere_completion AFTER INSERT OR UPDATE OF completed, reponses ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION ensure_quiz_result_on_matiere_completion();
CREATE TRIGGER trg_garde_activites_taxi_2026_v1 BEFORE INSERT OR UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION garde_activites_taxi_2026_v1();
CREATE TRIGGER trg_garde_cas_pratique_feries BEFORE INSERT OR UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION garde_cas_pratique_feries();
CREATE TRIGGER trg_garde_quiz_equipements_m64_sanctions_v1 BEFORE INSERT OR UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION garde_quiz_equipements_m64_sanctions_v1();
CREATE TRIGGER trg_garde_quiz_equipements_m64_v1 BEFORE INSERT OR UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION garde_quiz_equipements_m64_v1();
CREATE TRIGGER trg_garde_quiz_equipements_taxi_v1 BEFORE INSERT OR UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION garde_quiz_equipements_taxi_v1();
CREATE TRIGGER trg_protect_reponses_apprenants_terminal BEFORE INSERT OR UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION protect_reponses_apprenants_terminal();
CREATE TRIGGER trg_zy_garde_eb_legacy_cloture_vide BEFORE INSERT OR UPDATE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION garde_eb_legacy_cloture_vide();
CREATE TRIGGER trg_zz_garde_donnee_eleve BEFORE DELETE ON public.reponses_apprenants FOR EACH ROW EXECUTE FUNCTION garde_donnee_eleve('refuser');
CREATE TRIGGER trg_protect_reponses_apprenants_journal BEFORE DELETE OR UPDATE ON public.reponses_apprenants_journal FOR EACH ROW EXECUTE FUNCTION protect_reponses_apprenants_journal();
CREATE TRIGGER trg_bilan_snapshot_immuable BEFORE DELETE OR UPDATE ON public.bilan_passage_snapshots FOR EACH ROW EXECUTE FUNCTION bilan_snapshot_immuable();
CREATE TRIGGER trg_bilan_snapshot_no_truncate BEFORE TRUNCATE ON public.bilan_passage_snapshots FOR EACH STATEMENT EXECUTE FUNCTION bilan_snapshot_immuable();
CREATE TRIGGER trg_zz_garde_donnee_eleve BEFORE DELETE ON public.bilan_passage_snapshots FOR EACH ROW EXECUTE FUNCTION garde_donnee_eleve('refuser');
ALTER TABLE public.reponses_apprenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage reponses_apprenants" ON public.reponses_apprenants AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Comptes test exclus des lectures" ON public.reponses_apprenants AS RESTRICTIVE FOR SELECT TO authenticated USING (((NOT est_compte_test(apprenant_id)) OR est_proprietaire_apprenant(apprenant_id)));
CREATE POLICY "Learner can insert own reponses" ON public.reponses_apprenants AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM apprenants
  WHERE ((apprenants.auth_user_id = auth.uid()) AND (apprenants.id = reponses_apprenants.apprenant_id)))));
CREATE POLICY "Learner can read own reponses" ON public.reponses_apprenants AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM apprenants
  WHERE ((apprenants.auth_user_id = auth.uid()) AND (apprenants.id = reponses_apprenants.apprenant_id)))) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Learner can select own reponses" ON public.reponses_apprenants AS PERMISSIVE FOR SELECT TO authenticated USING ((is_current_user_apprenant(apprenant_id) AND (user_id = auth.uid())));
CREATE POLICY "Learner can select reponses without active session" ON public.reponses_apprenants AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM apprenants a
  WHERE ((a.id = reponses_apprenants.apprenant_id) AND (a.auth_user_id = auth.uid()))))));
CREATE POLICY "Learner can update own in_progress reponses" ON public.reponses_apprenants AS PERMISSIVE FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM apprenants
  WHERE ((apprenants.auth_user_id = auth.uid()) AND (apprenants.id = reponses_apprenants.apprenant_id)))) AND (COALESCE(completed, false) = false))) WITH CHECK ((EXISTS ( SELECT 1
   FROM apprenants
  WHERE ((apprenants.auth_user_id = auth.uid()) AND (apprenants.id = reponses_apprenants.apprenant_id)))));
CREATE POLICY "Service role can select reponses_apprenants" ON public.reponses_apprenants AS PERMISSIVE FOR SELECT TO service_role USING (true);
