CREATE TABLE public.qrc_ia_config (id boolean DEFAULT true NOT NULL, actif boolean DEFAULT false NOT NULL, modele text DEFAULT 'google/gemini-3.8-flash'::text NOT NULL, actif_depuis timestamp with time zone, pause_motif text, pause_depuis timestamp with time zone, updated_at timestamp with time zone DEFAULT now() NOT NULL, updated_by uuid, updated_email text);
CREATE TABLE public.qrc_ia_corrections (id uuid DEFAULT gen_random_uuid() NOT NULL, cle_idempotence text NOT NULL, qrc_instance_id uuid NOT NULL, attempt_id uuid NOT NULL, apprenant_id uuid NOT NULL, question_id text NOT NULL, exam_id text, matiere text, reponse_hash text NOT NULL, statut text DEFAULT 'en_cours'::text NOT NULL, motif text, note numeric, bareme numeric, justification text, modele text, http_status integer, cout_estime numeric, created_at timestamp with time zone DEFAULT now() NOT NULL, termine_at timestamp with time zone);
CREATE TABLE public.qrc_ia_reprises (id uuid DEFAULT gen_random_uuid() NOT NULL, qrc_instance_id uuid NOT NULL, base jsonb NOT NULL, numero integer DEFAULT 1 NOT NULL, statut text DEFAULT 'en_cours'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, lease_until timestamp with time zone DEFAULT (now() + '00:10:00'::interval) NOT NULL, termine_at timestamp with time zone, http_status integer, message text, resultat jsonb, run_id text);
CREATE TABLE public.qrc_instances_v2 (qrc_instance_id uuid DEFAULT gen_random_uuid() NOT NULL, attempt_id uuid NOT NULL, question_id text NOT NULL, apprenant_id uuid NOT NULL, reponse jsonb, etat text DEFAULT 'en_attente'::text NOT NULL, note numeric, corrige_par uuid, corrige_email text, corrige_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.user_roles (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, role app_role NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.qrc_instances_v2 ADD CONSTRAINT qrc_instances_v2_etat_chk CHECK ((etat = ANY (ARRAY['en_attente'::text, 'corrigee'::text])));
ALTER TABLE public.qrc_instances_v2 ADD CONSTRAINT qrc_instances_v2_pkey PRIMARY KEY (qrc_instance_id);
ALTER TABLE public.qrc_instances_v2 ADD CONSTRAINT qrc_instances_v2_unique UNIQUE (attempt_id, question_id);
ALTER TABLE public.qrc_ia_corrections ADD CONSTRAINT qrc_ia_corrections_cle_idempotence_key UNIQUE (cle_idempotence);
ALTER TABLE public.qrc_ia_corrections ADD CONSTRAINT qrc_ia_corrections_pkey PRIMARY KEY (id);
ALTER TABLE public.qrc_ia_corrections ADD CONSTRAINT qrc_ia_corrections_statut_check CHECK ((statut = ANY (ARRAY['en_cours'::text, 'appliquee'::text, 'a_verifier'::text, 'exclue'::text, 'erreur'::text, 'ignoree'::text])));
ALTER TABLE public.qrc_ia_reprises ADD CONSTRAINT qrc_ia_reprises_pkey PRIMARY KEY (id);
ALTER TABLE public.qrc_ia_reprises ADD CONSTRAINT qrc_ia_reprises_qrc_instance_id_numero_key UNIQUE (qrc_instance_id, numero);
ALTER TABLE public.qrc_ia_config ADD CONSTRAINT qrc_ia_config_id_check CHECK (id);
ALTER TABLE public.qrc_ia_config ADD CONSTRAINT qrc_ia_config_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.qrc_ia_reprises ADD CONSTRAINT qrc_ia_reprises_qrc_instance_id_fkey FOREIGN KEY (qrc_instance_id) REFERENCES qrc_instances_v2(qrc_instance_id);
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
$function$
;
CREATE OR REPLACE FUNCTION public.qrc_ia_publier_reprise(p_id uuid, p_operation uuid, p_note numeric, p_justification text, p_run_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r public.qrc_ia_reprises; q public.qrc_instances_v2; preuve jsonb;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.qrc_ia_reprises WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reprise introuvable'; END IF;
 IF r.statut='appliquee' THEN RETURN r.resultat; END IF;
 IF r.statut<>'en_cours' OR r.lease_until<=now() THEN RAISE EXCEPTION 'Reservation inactive'; END IF;
 SELECT * INTO q FROM public.qrc_instances_v2 WHERE qrc_instance_id=r.qrc_instance_id FOR UPDATE;
 IF q.etat<>'en_attente' THEN
  UPDATE public.qrc_ia_reprises SET statut='ignoree',termine_at=now(),message='Correction deja definitive' WHERE id=p_id;
  RETURN jsonb_build_object('ignoree',true);
 END IF;
 IF p_note<0 OR p_note>(r.base->>'bareme')::numeric OR mod(p_note*2,1)<>0 OR nullif(trim(p_justification),'') IS NULL THEN RAISE EXCEPTION 'Resultat invalide'; END IF;
 preuve:=public.core_correct_qrc_publish(p_operation,r.qrc_instance_id,p_note,'🤖 '||p_justification,'ia:'||(r.base->>'modele'));
 UPDATE public.qrc_ia_reprises SET statut='appliquee',termine_at=now(),http_status=200,resultat=preuve,message=p_justification,run_id=p_run_id WHERE id=p_id;
 RETURN preuve;
END $function$
;
CREATE OR REPLACE FUNCTION public.qrc_ia_reserver_reprise(p_qrc uuid, p_base jsonb, p_interruption_confirmee boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE q public.qrc_instances_v2; ancien public.qrc_ia_corrections; dernier public.qrc_ia_reprises; nouveau uuid; n integer; legacy_id uuid;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service uniquement' USING ERRCODE='42501'; END IF;
 SELECT * INTO q FROM public.qrc_instances_v2 WHERE qrc_instance_id=p_qrc FOR UPDATE;
 IF NOT FOUND OR q.etat<>'en_attente' OR q.apprenant_id='c0844007-b999-4385-9665-918e5077c3b5' THEN RETURN NULL; END IF;
 IF p_base->>'attempt_id' IS DISTINCT FROM q.attempt_id::text OR p_base->>'apprenant_id' IS DISTINCT FROM q.apprenant_id::text OR p_base->>'question_id' IS DISTINCT FROM q.question_id THEN RAISE EXCEPTION 'Identite incoherente'; END IF;
 IF EXISTS(SELECT 1 FROM public.qrc_ia_config WHERE id AND (NOT actif OR pause_depuis IS NOT NULL)) THEN RETURN NULL; END IF;
 SELECT * INTO dernier FROM public.qrc_ia_reprises WHERE qrc_instance_id=p_qrc ORDER BY numero DESC LIMIT 1;
 IF FOUND THEN
  IF dernier.numero>=2 OR dernier.statut<>'erreur' OR NOT (dernier.http_status=429 OR dernier.http_status>=500) OR dernier.termine_at IS NULL OR dernier.termine_at>now()-interval '30 seconds' THEN RETURN NULL; END IF;
  n:=dernier.numero+1;
 ELSE
  n:=1;
  SELECT * INTO ancien FROM public.qrc_ia_corrections WHERE qrc_instance_id=p_qrc LIMIT 1;
  IF FOUND THEN
   IF ancien.reponse_hash IS DISTINCT FROM p_base->>'reponse_hash' THEN RAISE EXCEPTION 'Version reponse incoherente'; END IF;
   IF NOT ((ancien.statut='erreur' AND (ancien.http_status=429 OR ancien.http_status>=500) AND ancien.termine_at<=now()-interval '30 seconds') OR (ancien.statut='en_cours' AND ancien.termine_at IS NULL AND p_interruption_confirmee AND ancien.created_at<=now()-interval '10 minutes')) THEN RETURN NULL; END IF;
  ELSE
   INSERT INTO public.qrc_ia_corrections(cle_idempotence,qrc_instance_id,attempt_id,apprenant_id,question_id,exam_id,matiere,reponse_hash,modele,bareme,statut)
   VALUES(p_base->>'cle_idempotence',p_qrc,q.attempt_id,q.apprenant_id,q.question_id,p_base->>'exam_id',p_base->>'matiere',p_base->>'reponse_hash',p_base->>'modele',(p_base->>'bareme')::numeric,'en_cours')
   ON CONFLICT(cle_idempotence) DO NOTHING RETURNING id INTO legacy_id;
   IF legacy_id IS NULL THEN RETURN NULL; END IF;
  END IF;
 END IF;
 INSERT INTO public.qrc_ia_reprises(qrc_instance_id,base,numero) VALUES(p_qrc,p_base,n) RETURNING id INTO nouveau;
 RETURN nouveau;
END $function$
;
CREATE OR REPLACE FUNCTION public.qrc_ia_reprise_immuable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Suppression trace IA interdite'; END IF;
 IF OLD.statut<>'en_cours' OR NEW.id<>OLD.id OR NEW.qrc_instance_id<>OLD.qrc_instance_id OR NEW.base IS DISTINCT FROM OLD.base OR NEW.numero<>OLD.numero OR NEW.created_at<>OLD.created_at OR NEW.lease_until<>OLD.lease_until THEN RAISE EXCEPTION 'Trace IA immuable'; END IF;
 RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.qrc_ia_corrections_append_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'QRC_IA_APPEND_ONLY: suppression interdite.' USING ERRCODE = 'P0498';
  END IF;
  IF OLD.statut <> 'en_cours' THEN
    RAISE EXCEPTION 'QRC_IA_APPEND_ONLY: une correction IA terminée est définitive.' USING ERRCODE = 'P0498';
  END IF;
  IF NEW.cle_idempotence IS DISTINCT FROM OLD.cle_idempotence OR NEW.qrc_instance_id IS DISTINCT FROM OLD.qrc_instance_id
     OR NEW.reponse_hash IS DISTINCT FROM OLD.reponse_hash OR NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id THEN
    RAISE EXCEPTION 'QRC_IA_APPEND_ONLY: identité immuable.' USING ERRCODE = 'P0498';
  END IF;
  RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.qrc_verification_cloture_humaine()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.etat = 'corrigee' AND NEW.corrige_email IS NOT NULL AND NEW.corrige_email NOT LIKE 'ia:%'
     AND (NEW.corrige_at IS DISTINCT FROM OLD.corrige_at OR NEW.corrige_email IS DISTINCT FROM OLD.corrige_email) THEN
    UPDATE public.qrc_verification_demandes
    SET statut = 'traitee', note_finale = NEW.note, traitee_par = NEW.corrige_par,
        traitee_email = NEW.corrige_email, traitee_at = now()
    WHERE qrc_instance_id = NEW.qrc_instance_id AND statut = 'a_traiter';
  END IF;
  RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION public.core_enforce_qrc_context()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  att public.exam_attempts_v2%ROWTYPE;
BEGIN
  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = NEW.attempt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTEMPT_INTROUVABLE: tentative % inexistante.', NEW.attempt_id
      USING ERRCODE = 'P0477';
  END IF;

  IF NEW.apprenant_id IS DISTINCT FROM att.apprenant_id THEN
    RAISE EXCEPTION 'QRC_OWNERSHIP: la QRC (apprenant %) n''appartient pas au proprietaire de la tentative (apprenant %).',
      NEW.apprenant_id, att.apprenant_id
      USING ERRCODE = 'P0477';
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.core_assert_session_owner(att.apprenant_id);

    IF att.etat <> 'en_cours' THEN
      RAISE EXCEPTION 'ATTEMPT_CLOSED: la tentative % est % : aucune QRC ne peut plus y etre creee.', att.attempt_id, att.etat
        USING ERRCODE = 'P0478';
    END IF;

    IF NOT public.core_snapshot_has_question(att.snapshot, NEW.question_id) THEN
      RAISE EXCEPTION 'QUESTION_HORS_SNAPSHOT: la question % ne fait pas partie du snapshot de la tentative % (examen %).',
        NEW.question_id, att.attempt_id, att.exam_id
        USING ERRCODE = 'P0479';
    END IF;
  ELSE
    -- Correction formateur autorisee apres la fin de la tentative,
    -- MAIS la reponse originale de l'eleve reste figee.
    IF NEW.reponse IS DISTINCT FROM OLD.reponse THEN
      RAISE EXCEPTION 'QRC_REPONSE_ELEVE_FIGEE: la reponse originale de l''eleve ne peut pas etre modifiee par une correction (%).',
        OLD.qrc_instance_id
        USING ERRCODE = 'P0480';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.enforce_qrc_v2_finality()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'QRC_DELETE_FORBIDDEN: une QRC ne peut pas etre supprimee (%).', OLD.qrc_instance_id
      USING ERRCODE = 'P0476';
  END IF;

  IF NEW.attempt_id IS DISTINCT FROM OLD.attempt_id
     OR NEW.question_id IS DISTINCT FROM OLD.question_id
     OR NEW.apprenant_id IS DISTINCT FROM OLD.apprenant_id THEN
    RAISE EXCEPTION 'QRC_IDENTITY_IMMUTABLE: l''identite d''une QRC est definitive (%).', OLD.qrc_instance_id
      USING ERRCODE = 'P0476';
  END IF;

  IF OLD.etat = 'corrigee' AND NEW.etat <> 'corrigee' THEN
    RAISE EXCEPTION 'QRC_CORRECTION_FINALE: une QRC corrigee ne peut pas revenir en attente (%).', OLD.qrc_instance_id
      USING ERRCODE = 'P0476';
  END IF;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.core_log_qrc_correction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_commentaire text := nullif(current_setting('core.qrc_commentaire', true), '');
  v_operation text := nullif(current_setting('core.qrc_operation_id', true), '');
BEGIN
  IF NEW.etat IS DISTINCT FROM OLD.etat OR NEW.note IS DISTINCT FROM OLD.note THEN
    INSERT INTO public.qrc_correction_events (
      qrc_instance_id, attempt_id, question_id, apprenant_id,
      etat_precedent, etat_nouveau, note_precedente, note_nouvelle,
      commentaire, corrige_par, corrige_email, operation_id
    ) VALUES (
      NEW.qrc_instance_id, NEW.attempt_id, NEW.question_id, NEW.apprenant_id,
      OLD.etat, NEW.etat, OLD.note, NEW.note,
      v_commentaire, NEW.corrige_par, NEW.corrige_email,
      CASE WHEN v_operation IS NULL THEN NULL ELSE v_operation::uuid END
    );
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.qrc_ia_enfiler_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 BEGIN
  PERFORM public.qrc_ia_enfiler(NEW.attempt_id, 'declencheur_' || TG_TABLE_NAME);
 EXCEPTION WHEN others THEN
  BEGIN
   INSERT INTO public.alertes_systeme(type,titre,message,details,lu) VALUES('qrc_ia_file','Mise en file IA échouée',
    'Passage conservé ; la réconciliation automatique réessaiera.', jsonb_build_object('attempt_id',NEW.attempt_id,'code',SQLSTATE)::text,false);
  EXCEPTION WHEN others THEN NULL;
  END;
 END;
 RETURN NULL;
END $function$
;
CREATE TRIGGER trg_qrc_ia_enfiler_qrc AFTER INSERT ON public.qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION qrc_ia_enfiler_trigger();
CREATE TRIGGER trg_qrc_v2_context BEFORE INSERT OR UPDATE ON public.qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION core_enforce_qrc_context();
CREATE TRIGGER trg_qrc_v2_correction_journal AFTER UPDATE ON public.qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION core_log_qrc_correction();
CREATE TRIGGER trg_qrc_v2_finality BEFORE DELETE OR UPDATE ON public.qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION enforce_qrc_v2_finality();
CREATE TRIGGER trg_qrc_verification_cloture AFTER UPDATE ON public.qrc_instances_v2 FOR EACH ROW EXECUTE FUNCTION qrc_verification_cloture_humaine();
CREATE TRIGGER trg_qrc_ia_corrections_append_only BEFORE DELETE OR UPDATE ON public.qrc_ia_corrections FOR EACH ROW EXECUTE FUNCTION qrc_ia_corrections_append_only();
CREATE TRIGGER qrc_ia_reprise_immuable BEFORE DELETE OR UPDATE ON public.qrc_ia_reprises FOR EACH ROW EXECUTE FUNCTION qrc_ia_reprise_immuable();
ALTER TABLE public.qrc_instances_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qrc_ia_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qrc_ia_reprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qrc_ia_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;