-- QRC V2 : attribution automatique AMONT des seules réponses identiques au corrigé figé.
-- NON INSTALLÉ. Revue + accord du propriétaire requis avant application.
-- Portée : uniquement les QRC « en_attente » d'une tentative qui vient de passer en_cours -> terminee.
-- Jamais : réécriture d'une QRC corrigée, 0 technique, prénote, retry, rafale, rétroactivité.

-- Normalisation SANS portée sémantique : casse, accents, espaces, ponctuation.
-- Conservés : chiffres, séparateur décimal entre chiffres, signe moins devant un chiffre, %, €, unités, négations.
CREATE OR REPLACE FUNCTION public.qrc_normaliser_exact(p text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path TO 'pg_catalog', 'public' AS $$
  SELECT btrim(regexp_replace(
           regexp_replace(
             regexp_replace(lower(public.unaccent(coalesce(p, ''))), '([0-9])\s*[,.]\s*([0-9])', '\1#\2', 'g'),
             '[[:space:].,;:!?"''’‘`«»()\[\]…_]+|(?<![0-9])-(?![0-9])|-$', ' ', 'g'),
           '\s+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.qrc_auto_exact_match(p_attempt_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp' AS $$
DECLARE
  att public.exam_attempts_v2%ROWTYPE;
  r record;
  v_q jsonb; v_nb int; v_bareme numeric; v_attendu text; v_rep text; v_op uuid;
  n int := 0;
BEGIN
  SELECT * INTO att FROM public.exam_attempts_v2 WHERE attempt_id = p_attempt_id;
  IF NOT FOUND OR att.etat <> 'terminee' THEN RETURN 0; END IF;

  FOR r IN SELECT * FROM public.qrc_instances_v2
           WHERE attempt_id = p_attempt_id AND etat = 'en_attente' AND note IS NULL
           ORDER BY qrc_instance_id FOR UPDATE LOOP
    -- Même question, même version : uniquement le snapshot figé de CETTE tentative, une seule occurrence.
    SELECT count(*), min(q) INTO v_nb, v_q
      FROM jsonb_array_elements(coalesce(att.snapshot->'questions', '[]')) q
     WHERE q->>'id' = r.question_id;
    CONTINUE WHEN v_nb <> 1 OR coalesce(v_q->>'type', '') <> 'QRC';
    v_attendu := v_q->>'reponseQRC';
    CONTINUE WHEN public.qrc_normaliser_exact(v_attendu) = '';
    -- Barème prouvé : restauré, sinon points du snapshot (numérique > 0) ; inconnu = attente.
    SELECT b.bareme INTO v_bareme FROM public.qrc_bareme_restaure b WHERE b.qrc_instance_id = r.qrc_instance_id;
    IF v_bareme IS NULL AND coalesce(v_q->>'points', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN v_bareme := (v_q->>'points')::numeric; END IF;
    CONTINUE WHEN v_bareme IS NULL OR v_bareme <= 0;
    -- Réponse texte uniquement ; vide ou non texte = attente (jamais 0 ici).
    CONTINUE WHEN r.reponse IS NULL OR jsonb_typeof(r.reponse) <> 'string';
    v_rep := r.reponse #>> '{}';
    CONTINUE WHEN public.qrc_normaliser_exact(v_rep) = ''
               OR public.qrc_normaliser_exact(v_rep) <> public.qrc_normaliser_exact(v_attendu);
    -- Identifiant d'opération déterministe : un seul passage possible par QRC (pas de double correction).
    v_op := (md5('qrc_auto_exact_match:' || r.qrc_instance_id::text))::uuid;
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.core_operations o WHERE o.operation_id = v_op);

    PERFORM set_config('core.qrc_commentaire', 'Réponse identique au corrigé officiel (correction automatique)', true);
    PERFORM set_config('core.qrc_operation_id', v_op::text, true);
    UPDATE public.qrc_instances_v2
       SET etat = 'corrigee', note = v_bareme, corrige_par = NULL, corrige_email = 'auto_exact_match', corrige_at = now()
     WHERE qrc_instance_id = r.qrc_instance_id AND etat = 'en_attente' AND note IS NULL;
    PERFORM set_config('core.qrc_commentaire', '', true);
    PERFORM set_config('core.qrc_operation_id', '', true);
    CONTINUE WHEN NOT FOUND;

    INSERT INTO public.core_operations (operation_id, operation_type, apprenant_id, attempt_id, auteur, cible, resultat)
    VALUES (v_op, 'qrc_correction', r.apprenant_id, p_attempt_id, NULL,
            jsonb_build_object('qrc_instance_id', r.qrc_instance_id, 'mode', 'auto_exact_match'),
            jsonb_build_object('qrc_instance_id', r.qrc_instance_id, 'etat', 'corrigee', 'note', v_bareme));
    INSERT INTO public.audit_journal (operation, cible_type, cible_id, attempt_id, apprenant_id, auteur, auteur_email, avant, apres, origine)
    VALUES ('qrc_correction', 'qrc_instances_v2', r.qrc_instance_id::text, p_attempt_id, r.apprenant_id, NULL, 'auto_exact_match',
            jsonb_build_object('etat', 'en_attente', 'reponse', v_rep),
            jsonb_build_object('etat', 'corrigee', 'note', v_bareme, 'bareme', v_bareme, 'question_id', r.question_id,
                               'corrige_normalise', public.qrc_normaliser_exact(v_attendu)),
            'qrc_auto_exact_match');
    n := n + 1;
  END LOOP;

  IF n > 0 THEN PERFORM public.core_recalc_result(p_attempt_id); END IF;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.qrc_auto_exact_match(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.qrc_normaliser_exact(text) FROM PUBLIC, anon;

-- Déclenché une seule fois à la fin du passage ; ne bloque JAMAIS la remise (échec = QRC laissées en attente + alerte).
CREATE OR REPLACE FUNCTION public.qrc_auto_exact_match_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp' AS $$
BEGIN
  BEGIN
    PERFORM public.qrc_auto_exact_match(NEW.attempt_id);
  EXCEPTION WHEN others THEN
    BEGIN
      INSERT INTO public.alertes_systeme(type, titre, message, details, lu)
      VALUES ('qrc_auto_exact', 'Correction automatique exacte non appliquée',
              'Passage conservé ; ses QRC restent en attente de correction manuelle.',
              jsonb_build_object('attempt_id', NEW.attempt_id, 'code', SQLSTATE)::text, false);
    EXCEPTION WHEN others THEN NULL;
    END;
  END;
  RETURN NULL;
END $$;

-- Nom « trg_qrc_aa_* » : s'exécute avant trg_qrc_ia_enfiler_passage (ordre alphabétique), l'IA ne voit plus ces QRC.
DROP TRIGGER IF EXISTS trg_qrc_aa_auto_exact ON public.exam_attempts_v2;
CREATE TRIGGER trg_qrc_aa_auto_exact
AFTER UPDATE OF etat ON public.exam_attempts_v2
FOR EACH ROW WHEN (OLD.etat = 'en_cours' AND NEW.etat = 'terminee')
EXECUTE FUNCTION public.qrc_auto_exact_match_trigger();
