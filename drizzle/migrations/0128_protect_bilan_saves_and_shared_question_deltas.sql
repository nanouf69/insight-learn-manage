CREATE OR REPLACE FUNCTION public.ensure_module_editor_manual_flags()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE patched_exercices jsonb;
BEGIN
 IF current_setting('app.restauration_sauvegarde', true) = 'on' THEN RETURN NEW; END IF;
 IF NEW.module_id IN (4,5,7,9,10,11,12,13,24,27,28,29,30,40,42,64,81,82,87,90) AND jsonb_typeof(NEW.module_data->'exercices') = 'array' THEN
 SELECT jsonb_agg(CASE WHEN jsonb_typeof(e.exercise->'questions')='array' THEN e.exercise || jsonb_build_object('questions',COALESCE((SELECT jsonb_agg(CASE WHEN OLD.module_data IS NOT NULL THEN COALESCE((SELECT CASE
 WHEN q.question IS NOT DISTINCT FROM oldq.old_question_value THEN q.question
 WHEN oldq.old_question_value IS NOT NULL AND oldq.old_edited_at IS NOT NULL AND (newq.new_edited_at IS NULL OR oldq.old_edited_at>newq.new_edited_at) THEN oldq.old_question_value
 ELSE q.question || jsonb_build_object('manually_edited',true) || CASE WHEN q.question ? '_editedAt' THEN '{}'::jsonb ELSE jsonb_build_object('_editedAt',now()) END END
 FROM LATERAL (SELECT oe.exercise AS old_exercise_value FROM jsonb_array_elements(public.jsonb_as_array(OLD.module_data->'exercices')) AS oe(exercise) WHERE oe.exercise->>'id'=e.exercise->>'id' LIMIT 1) olde
 LEFT JOIN LATERAL (SELECT oq.question AS old_question_value, CASE WHEN oq.question ? '_editedAt' THEN NULLIF(oq.question->>'_editedAt','')::timestamptz ELSE NULL END AS old_edited_at FROM jsonb_array_elements(public.jsonb_as_array(olde.old_exercise_value->'questions')) AS oq(question) WHERE oq.question->>'id'=q.question->>'id' LIMIT 1) oldq ON true
 CROSS JOIN LATERAL (SELECT CASE WHEN q.question ? '_editedAt' THEN NULLIF(q.question->>'_editedAt','')::timestamptz ELSE NULL END AS new_edited_at) newq),q.question || jsonb_build_object('manually_edited',true) || CASE WHEN q.question ? '_editedAt' THEN '{}'::jsonb ELSE jsonb_build_object('_editedAt',now()) END)
 ELSE q.question || jsonb_build_object('manually_edited',true) || CASE WHEN q.question ? '_editedAt' THEN '{}'::jsonb ELSE jsonb_build_object('_editedAt',now()) END END ORDER BY q.q_ord) FROM jsonb_array_elements(public.jsonb_as_array(e.exercise->'questions')) WITH ORDINALITY AS q(question,q_ord)),'[]'::jsonb)) ELSE e.exercise END ORDER BY e.e_ord)
 INTO patched_exercices FROM jsonb_array_elements(public.jsonb_as_array(NEW.module_data->'exercices')) WITH ORDINALITY AS e(exercise,e_ord);
 NEW.module_data:=jsonb_set(NEW.module_data,'{exercices}',COALESCE(patched_exercices,'[]'::jsonb),true);
 END IF;
 RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.propagate_shared_exercices()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
 v_changed jsonb:='[]'::jsonb; v_removed text[]:=ARRAY[]::text[]; v_exo jsonb; v_old_exo jsonb; v_repl jsonb; v_target record; v_new_exos jsonb; v_touched boolean; v_partial jsonb; v_old_source jsonb;
BEGIN
 IF coalesce(current_setting('app.shared_exercice_sync',true),'0')='1' THEN RETURN NULL; END IF;
 IF jsonb_typeof(coalesce(NEW.module_data->'exercices','null'::jsonb))<>'array' THEN RETURN NULL; END IF;
 FOR v_exo IN SELECT value FROM jsonb_array_elements(NEW.module_data->'exercices') LOOP
 IF v_exo->>'id' IS NULL THEN CONTINUE; END IF;
 v_old_exo:=NULL;
 IF jsonb_typeof(coalesce(OLD.module_data->'exercices','null'::jsonb))='array' THEN
 SELECT e INTO v_old_exo FROM jsonb_array_elements(OLD.module_data->'exercices') e WHERE public.shared_exercice_key(e)=public.shared_exercice_key(v_exo) LIMIT 1;
 END IF;
 IF v_old_exo IS NULL OR (v_old_exo-'actif') IS DISTINCT FROM (v_exo-'actif') THEN v_changed:=v_changed || jsonb_build_array(v_exo); END IF;
 END LOOP;
 IF jsonb_typeof(coalesce(OLD.module_data->'exercices','null'::jsonb))='array' THEN
 SELECT coalesce(array_agg(public.shared_exercice_strict_key(e)),ARRAY[]::text[]) INTO v_removed FROM jsonb_array_elements(OLD.module_data->'exercices') e
 WHERE e->>'id' IS NOT NULL AND public.shared_exercice_strict_key(e) IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.module_data->'exercices') n WHERE public.shared_exercice_key(n)=public.shared_exercice_key(e));
 END IF;
 IF jsonb_array_length(v_changed)=0 AND coalesce(array_length(v_removed,1),0)=0 THEN RETURN NULL; END IF;
 PERFORM set_config('app.shared_exercice_sync','1',true);
 FOR v_target IN SELECT module_id,module_data FROM public.module_editor_state WHERE module_id<>NEW.module_id AND jsonb_typeof(coalesce(module_data->'exercices','null'::jsonb))='array' AND jsonb_array_length(module_data->'exercices')>0 LOOP
 v_touched:=false; v_new_exos:='[]'::jsonb;
 FOR v_exo IN SELECT value FROM jsonb_array_elements(v_target.module_data->'exercices') LOOP
 IF v_exo->>'id' IS NOT NULL AND public.shared_exercice_strict_key(v_exo) IS NOT NULL AND public.shared_exercice_strict_key(v_exo)=ANY(v_removed) THEN v_touched:=true; CONTINUE; END IF;
 v_repl:=NULL;
 IF v_exo->>'id' IS NOT NULL THEN SELECT c INTO v_repl FROM jsonb_array_elements(v_changed) c WHERE public.shared_exercice_key(c)=public.shared_exercice_key(v_exo) LIMIT 1; END IF;
 IF v_repl IS NOT NULL THEN
 SELECT e INTO v_old_source FROM jsonb_array_elements(public.jsonb_as_array(OLD.module_data->'exercices')) e WHERE public.shared_exercice_key(e)=public.shared_exercice_key(v_repl) LIMIT 1;
 -- Content-only edits preserve unrelated target questions and their historical metadata.
 IF v_old_source IS NOT NULL AND (v_old_source-ARRAY['actif','questions'])=(v_repl-ARRAY['actif','questions']) AND jsonb_typeof(v_old_source->'questions')='array' AND jsonb_typeof(v_repl->'questions')='array'
 AND (SELECT jsonb_agg(q->'id' ORDER BY ord) FROM jsonb_array_elements(v_old_source->'questions') WITH ORDINALITY t(q,ord)) IS NOT DISTINCT FROM (SELECT jsonb_agg(q->'id' ORDER BY ord) FROM jsonb_array_elements(v_repl->'questions') WITH ORDINALITY t(q,ord)) THEN
 SELECT coalesce(jsonb_agg(CASE WHEN nq.q IS NOT NULL AND oq.q IS NOT NULL AND nq.q IS DISTINCT FROM oq.q THEN nq.q ELSE tq.q END ORDER BY tq.ord),'[]'::jsonb) INTO v_partial
 FROM jsonb_array_elements(public.jsonb_as_array(v_exo->'questions')) WITH ORDINALITY tq(q,ord)
 LEFT JOIN LATERAL (SELECT q FROM jsonb_array_elements(v_repl->'questions') AS n(q) WHERE q->>'id'=tq.q->>'id' LIMIT 1) nq ON true
 LEFT JOIN LATERAL (SELECT q FROM jsonb_array_elements(v_old_source->'questions') AS o(q) WHERE q->>'id'=tq.q->>'id' LIMIT 1) oq ON true;
 v_repl:=jsonb_set(v_exo,'{questions}',v_partial);
 END IF;
 END IF;
 IF v_repl IS NOT NULL THEN v_repl:=v_repl-'actif'; IF v_exo ? 'actif' THEN v_repl:=v_repl || jsonb_build_object('actif',v_exo->'actif'); END IF; END IF;
 IF v_repl IS NOT NULL AND v_repl IS DISTINCT FROM v_exo THEN v_touched:=true; v_new_exos:=v_new_exos || jsonb_build_array(v_repl); ELSE v_new_exos:=v_new_exos || jsonb_build_array(v_exo); END IF;
 END LOOP;
 IF v_touched THEN UPDATE public.module_editor_state SET module_data=jsonb_set(module_data,'{exercices}',v_new_exos,true),updated_at=now() WHERE module_id=v_target.module_id; END IF;
 END LOOP;
 PERFORM set_config('app.shared_exercice_sync','0',true);
 RETURN NULL;
END;
$function$;
CREATE OR REPLACE FUNCTION public.trg_sync_bilans_from_cours()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
 -- Legacy whole-block reconstruction is not a safe consequence of any module save.
 -- Preserve existing bilan content and attempts. Shared quiz deltas retain their own trigger.
 -- The explicit legacy sync function remains, but is never automatically called here.
 RETURN NEW;
END;
$function$;
COMMENT ON FUNCTION public.trg_sync_bilans_from_cours() IS 'No automatic whole-bilan reconstruction on module saves; existing content and learner histories preserved (approved 2026-10-07).';