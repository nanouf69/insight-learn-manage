-- CANDIDAT APERÇU UNIQUEMENT — non appliqué à Lovable Cloud.
-- Durcissement additif des futures publications/finalisations ; aucun backfill ni recalcul.

CREATE OR REPLACE FUNCTION public.core_snapshot_has_question(p_snapshot jsonb, p_question_id text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(p_snapshot->'questions','[]'::jsonb)) q
    WHERE q->>'id' = p_question_id
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_exam_version_immutability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'EXAM_VERSION_IMMUTABLE: suppression interdite (version %)', OLD.id USING ERRCODE = 'P0472';
  END IF;
  IF OLD.statut = 'brouillon' THEN RETURN NEW; END IF;
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.fingerprint IS DISTINCT FROM OLD.fingerprint
     OR NEW.exam_id IS DISTINCT FROM OLD.exam_id
     OR NEW.filiere IS DISTINCT FROM OLD.filiere
     OR NEW.exam_numero IS DISTINCT FROM OLD.exam_numero
     OR NEW.version_number IS DISTINCT FROM OLD.version_number THEN
    RAISE EXCEPTION 'EXAM_VERSION_IMMUTABLE: contenu ou identité immuable (version %)', OLD.id USING ERRCODE = 'P0472';
  END IF;
  IF OLD.statut = 'publiee' AND NEW.statut NOT IN ('publiee','retiree') THEN
    RAISE EXCEPTION 'EXAM_VERSION_IMMUTABLE: transition interdite' USING ERRCODE = 'P0472';
  END IF;
  IF OLD.statut = 'retiree' AND NEW.statut <> 'retiree' THEN
    RAISE EXCEPTION 'EXAM_VERSION_IMMUTABLE: version retirée non réactivable' USING ERRCODE = 'P0472';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.core_validate_exam_content(p_content jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE q jsonb; m jsonb; ids text[];
BEGIN
  IF p_content IS NULL OR jsonb_typeof(p_content->'questions') <> 'array'
     OR jsonb_array_length(p_content->'questions') = 0
     OR jsonb_typeof(p_content->'matieres') <> 'array'
     OR jsonb_array_length(p_content->'matieres') = 0 THEN
    RAISE EXCEPTION 'CONTENU_INVALIDE: matières et questions obligatoires' USING ERRCODE = 'P0482';
  END IF;
  FOR m IN SELECT value FROM jsonb_array_elements(p_content->'matieres') LOOP
    IF nullif(btrim(m->>'subject_id'),'') IS NULL
       OR (m->>'duree')::numeric < 0
       OR coalesce((m->>'coefficient')::numeric,0) <= 0
       OR coalesce((m->>'note_sur')::numeric,0) <= 0
       OR (m->>'note_eliminatoire') IS NULL THEN
      RAISE EXCEPTION 'CONTENU_INVALIDE: métadonnées/barème de matière incomplets' USING ERRCODE = 'P0482';
    END IF;
  END LOOP;
  FOR q IN SELECT value FROM jsonb_array_elements(p_content->'questions') LOOP
    IF nullif(btrim(q->>'id'),'') IS NULL OR nullif(btrim(q->>'matiere'),'') IS NULL
       OR q->>'type' NOT IN ('QCM','QRC')
       OR nullif(btrim(q->>'enonce'),'') IS NULL
       OR coalesce((q->>'points')::numeric,0) <= 0 THEN
      RAISE EXCEPTION 'CONTENU_INVALIDE: question incomplète %', q->>'id' USING ERRCODE = 'P0482';
    END IF;
    IF q->>'type' = 'QCM' AND (
      jsonb_typeof(q->'choix') <> 'array' OR jsonb_array_length(q->'choix') = 0
      OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(q->'choix') c WHERE c.value->>'correct' = 'true')
    ) THEN
      RAISE EXCEPTION 'CONTENU_INVALIDE: clé QCM absente %', q->>'id' USING ERRCODE = 'P0482';
    END IF;
    IF q->>'type' = 'QRC' AND nullif(btrim(q->>'reponseQRC'),'') IS NULL THEN
      RAISE EXCEPTION 'CONTENU_INVALIDE: corrigé QRC absent %', q->>'id' USING ERRCODE = 'P0482';
    END IF;
    ids := array_append(ids,q->>'id');
  END LOOP;
  IF (SELECT count(DISTINCT id) FROM unnest(ids) id) <> array_length(ids,1) THEN
    RAISE EXCEPTION 'CONTENU_INVALIDE: identifiants de questions dupliqués' USING ERRCODE = 'P0482';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.core_publish_version_contenu(
  p_operation_id uuid,p_filiere text,p_exam_numero text,p_module_id integer,p_exam_id text,
  p_content jsonb,p_email text DEFAULT NULL,p_is_test boolean DEFAULT false
) RETURNS public.exam_content_versions
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE rejeu jsonb; v_fingerprint text; v_active public.exam_content_versions;
  v_num integer; v_row public.exam_content_versions;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'PUBLICATION_REFUSEE' USING ERRCODE = 'P0481';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('exam-publish:' || p_exam_id,0));
  rejeu := public.core_operation_replay(p_operation_id,'exam_version_publish_contenu');
  IF rejeu IS NOT NULL THEN
    SELECT * INTO v_row FROM public.exam_content_versions WHERE id=(rejeu#>>'{resultat,version_id}')::uuid;
    RETURN v_row;
  END IF;
  PERFORM public.core_validate_exam_content(p_content);
  v_fingerprint := md5(p_content::text);
  SELECT * INTO v_active FROM public.exam_content_versions
   WHERE exam_id=p_exam_id AND statut='publiee' AND retired_at IS NULL;
  IF FOUND AND v_active.fingerprint=v_fingerprint THEN RETURN v_active; END IF;

  -- Un ID disparu de la version précédente ne peut pas réapparaître pour une autre question.
  IF FOUND AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_content->'questions') n
    WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_active.content->'questions') a WHERE a.value->>'id'=n.value->>'id')
      AND EXISTS (
        SELECT 1 FROM public.exam_content_versions old
        CROSS JOIN LATERAL jsonb_array_elements(old.content->'questions') o
        WHERE old.exam_id=p_exam_id AND old.id<>v_active.id AND o.value->>'id'=n.value->>'id'
      )
  ) THEN
    RAISE EXCEPTION 'QUESTION_ID_REUTILISE: revue manuelle obligatoire' USING ERRCODE = 'P0482';
  END IF;

  IF FOUND THEN UPDATE public.exam_content_versions SET statut='retiree',retired_at=now() WHERE id=v_active.id; END IF;
  SELECT coalesce(max(version_number),0)+1 INTO v_num FROM public.exam_content_versions WHERE exam_id=p_exam_id;
  INSERT INTO public.exam_content_versions
    (filiere,exam_numero,module_id,exam_id,version_number,statut,content,fingerprint,motif,
     created_by,created_email,published_by,published_email,published_at,is_test)
  VALUES
    (p_filiere,p_exam_numero,p_module_id,p_exam_id,v_num,'publiee',p_content,v_fingerprint,
     'Publication validée pour les futures tentatives uniquement',auth.uid(),p_email,auth.uid(),p_email,now(),p_is_test)
  RETURNING * INTO v_row;
  INSERT INTO public.core_operations(operation_id,operation_type,auteur,cible,resultat)
  VALUES(p_operation_id,'exam_version_publish_contenu',auth.uid(),jsonb_build_object('exam_id',p_exam_id),
         jsonb_build_object('version_id',v_row.id,'fingerprint',v_fingerprint,'version_number',v_num));
  INSERT INTO public.audit_journal(operation,cible_type,cible_id,exam_id,exam_version_id,auteur,apres,origine)
  VALUES('exam_version_publish','exam_content_versions',v_row.id::text,p_exam_id,v_row.id,auth.uid(),
         jsonb_build_object('fingerprint',v_fingerprint,'version_number',v_num,'is_test',p_is_test),
         'core_publish_version_contenu');
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.core_assert_snapshot_notation_fiable(p_snapshot jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE q jsonb;
BEGIN
  IF jsonb_typeof(p_snapshot->'questions') <> 'array' OR jsonb_array_length(p_snapshot->'questions')=0 THEN
    RAISE EXCEPTION 'SNAPSHOT_A_REVOIR: questions absentes' USING ERRCODE = 'P0479';
  END IF;
  FOR q IN SELECT value FROM jsonb_array_elements(p_snapshot->'questions') LOOP
    IF nullif(btrim(q->>'id'),'') IS NULL OR q->>'type' NOT IN ('QCM','QRC')
       OR nullif(btrim(q->>'enonce'),'') IS NULL OR coalesce((q->>'points')::numeric,0)<=0 THEN
      RAISE EXCEPTION 'SNAPSHOT_A_REVOIR: question/barème incomplet %',q->>'id' USING ERRCODE = 'P0479';
    END IF;
    IF q->>'type'='QCM' AND (
      jsonb_typeof(q->'choix')<>'array' OR jsonb_array_length(q->'choix')=0
      OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q->'choix') c WHERE c.value->>'correct'='true')
    ) THEN
      RAISE EXCEPTION 'SNAPSHOT_A_REVOIR: clé QCM absente %',q->>'id' USING ERRCODE = 'P0479';
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.core_result_snapshot_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE snap jsonb;
BEGIN
  SELECT snapshot INTO snap FROM public.exam_attempts_v2 WHERE attempt_id=NEW.attempt_id;
  PERFORM public.core_assert_snapshot_notation_fiable(snap);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_core_result_snapshot_fiable ON public.core_exam_results;
CREATE TRIGGER trg_core_result_snapshot_fiable BEFORE INSERT OR UPDATE ON public.core_exam_results
FOR EACH ROW EXECUTE FUNCTION public.core_result_snapshot_guard();

CREATE OR REPLACE FUNCTION public.core_attempt_completion_snapshot_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE expected text[]; actual text[];
BEGIN
  IF NEW.etat='terminee' AND OLD.etat IS DISTINCT FROM 'terminee' THEN
    SELECT array_agg(q->>'id') INTO expected
      FROM jsonb_array_elements(COALESCE(NEW.snapshot->'questions','[]'::jsonb)) q WHERE q->>'type'='QRC';
    SELECT array_agg(i.question_id) INTO actual FROM public.qrc_instances_v2 i WHERE i.attempt_id=NEW.attempt_id;
    IF coalesce(array_length(expected,1),0)<>coalesce(array_length(actual,1),0)
       OR EXISTS(SELECT 1 FROM unnest(coalesce(expected,'{}'::text[])) e WHERE NOT e=ANY(coalesce(actual,'{}'::text[])))
       OR EXISTS(SELECT 1 FROM unnest(coalesce(actual,'{}'::text[])) a WHERE NOT a=ANY(coalesce(expected,'{}'::text[]))) THEN
      RAISE EXCEPTION 'QRC_SNAPSHOT_INCOMPLET: toutes et seules les QRC figées sont requises' USING ERRCODE = 'P0479';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_attempt_completion_snapshot ON public.exam_attempts_v2;
CREATE TRIGGER trg_attempt_completion_snapshot BEFORE UPDATE ON public.exam_attempts_v2
FOR EACH ROW EXECUTE FUNCTION public.core_attempt_completion_snapshot_guard();
