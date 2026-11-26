-- SELECT capture 26/11/2026 09:14 UTC, schema/guards only, no production rows.
CREATE TABLE public.bilan_sync_journal (id uuid DEFAULT gen_random_uuid() NOT NULL, lien_id uuid, evenement text NOT NULL, sens text, source_module_id integer, cible_module_id integer, question_id integer, avant jsonb, apres jsonb, empreinte_avant text, empreinte_apres text, auteur uuid, motif text, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.bilan_sync_liens (id uuid DEFAULT gen_random_uuid() NOT NULL, matiere_key text NOT NULL, vtc_module_id integer DEFAULT 5 NOT NULL, vtc_exercice_id integer NOT NULL, vtc_question_id integer NOT NULL, taxi_module_id integer DEFAULT 11 NOT NULL, taxi_exercice_id integer NOT NULL, taxi_question_id integer NOT NULL, statut text DEFAULT 'en_attente'::text NOT NULL, motif text, created_by uuid, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, empreinte_vtc_ref text, empreinte_taxi_ref text);
ALTER TABLE public.bilan_sync_liens ADD CONSTRAINT bilan_sync_liens_pkey PRIMARY KEY (id);
ALTER TABLE public.bilan_sync_liens ADD CONSTRAINT bilan_sync_liens_matieres_communes CHECK (((((((matiere_key = 'bilan_t3p'::text) AND (vtc_exercice_id = 500) AND (taxi_exercice_id = 600)) OR ((matiere_key = 'bilan_gestion'::text) AND (vtc_exercice_id = 501) AND (taxi_exercice_id = 601))) OR ((matiere_key = 'bilan_securite'::text) AND (vtc_exercice_id = 502) AND (taxi_exercice_id = 602))) OR ((matiere_key = 'bilan_francais'::text) AND (vtc_exercice_id = 503) AND (taxi_exercice_id = 603))) OR ((matiere_key = 'bilan_anglais'::text) AND (vtc_exercice_id = 504) AND (taxi_exercice_id = 604))));
ALTER TABLE public.bilan_sync_liens ADD CONSTRAINT bilan_sync_liens_modules CHECK (((vtc_module_id = 5) AND (taxi_module_id = 11)));
ALTER TABLE public.bilan_sync_liens ADD CONSTRAINT bilan_sync_liens_statut CHECK ((statut = ANY (ARRAY['liee'::text, 'en_attente'::text, 'specifique'::text])));
ALTER TABLE public.bilan_sync_liens ADD CONSTRAINT bilan_sync_liens_taxi_unique UNIQUE (taxi_exercice_id, taxi_question_id);
ALTER TABLE public.bilan_sync_liens ADD CONSTRAINT bilan_sync_liens_vtc_unique UNIQUE (vtc_exercice_id, vtc_question_id);
ALTER TABLE public.bilan_sync_journal ADD CONSTRAINT bilan_sync_journal_lien_id_fkey FOREIGN KEY (lien_id) REFERENCES bilan_sync_liens(id);
ALTER TABLE public.bilan_sync_journal ADD CONSTRAINT bilan_sync_journal_pkey PRIMARY KEY (id);
ALTER TABLE public.bilan_sync_journal ADD CONSTRAINT bilan_sync_journal_sens CHECK (((sens IS NULL) OR (sens = ANY (ARRAY['vtc_vers_taxi'::text, 'taxi_vers_vtc'::text]))));
CREATE OR REPLACE FUNCTION public.bilan_sync_liens_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
END $function$;
CREATE OR REPLACE FUNCTION public.forbid_mutation_append_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'APPEND_ONLY: la table % est en ecriture seule (ni modification ni suppression).', TG_TABLE_NAME
    USING ERRCODE = 'P0474';
END;
$function$;
CREATE TRIGGER trg_bilan_sync_journal_append_only BEFORE DELETE OR UPDATE ON public.bilan_sync_journal FOR EACH ROW EXECUTE FUNCTION forbid_mutation_append_only();
CREATE TRIGGER trg_bilan_sync_journal_no_truncate BEFORE TRUNCATE ON public.bilan_sync_journal FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation_append_only();
CREATE TRIGGER trg_bilan_sync_liens_guard BEFORE DELETE OR UPDATE ON public.bilan_sync_liens FOR EACH ROW EXECUTE FUNCTION bilan_sync_liens_guard();