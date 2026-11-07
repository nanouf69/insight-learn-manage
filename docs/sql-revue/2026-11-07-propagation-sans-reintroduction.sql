-- BROUILLON DE REVUE — NON APPLIQUÉ (07/11/2026). Ne pas exécuter sans validation distincte.
-- Objet : empêcher qu'une propagation d'exercice partagé réintroduise dans un module des questions
-- que ce module avait supprimées (cas VTC 2 / TAXI 10, exercice 62, Q40-Q41 : supprimées TAXI
-- 05/11 14:19, réinsérées par la propagation de la suppression de Q49 côté VTC à 19:30).
-- Seule modification par rapport à la définition de production lue le 07/11 : le bloc daté 07/11.
-- Aucune donnée modifiée : la fonction n'agit qu'aux prochains enregistrements admin.
-- Test : python3 src/test/propagation_reintroduction_contract.py (base jetable).
CREATE OR REPLACE FUNCTION public.propagate_shared_exercices()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
 v_changed jsonb:='[]'::jsonb; v_removed text[]:=ARRAY[]::text[]; v_exo jsonb; v_repl jsonb; v_target record; v_new_exos jsonb; v_touched boolean; v_partial jsonb; v_old_source jsonb;
 v_new_list jsonb; v_old_list jsonb:='[]'::jsonb; v_old_by_key jsonb:='{}'::jsonb; v_changed_by_key jsonb:='{}'::jsonb; v_changed_keys text[]:=ARRAY[]::text[]; v_key text; v_target_list jsonb;
BEGIN
 IF coalesce(current_setting('app.shared_exercice_sync',true),'0')='1' THEN RETURN NULL; END IF;
 IF jsonb_typeof(coalesce(NEW.module_data->'exercices','null'::jsonb))<>'array' THEN RETURN NULL; END IF;
 -- Set-based (one pass per JSON document): same decisions as the previous per-element loops.
 v_new_list:=NEW.module_data->'exercices';
 IF jsonb_typeof(coalesce(OLD.module_data->'exercices','null'::jsonb))='array' THEN v_old_list:=OLD.module_data->'exercices'; END IF;
 SELECT coalesce(jsonb_object_agg(k,e),'{}'::jsonb) INTO v_old_by_key FROM (
   SELECT DISTINCT ON (k) k,e FROM (SELECT public.shared_exercice_key(e) k,e,ord FROM jsonb_array_elements(v_old_list) WITH ORDINALITY t(e,ord)) s ORDER BY k,ord) f;
 SELECT coalesce(jsonb_agg(n.v ORDER BY n.ord),'[]'::jsonb) INTO v_changed FROM (SELECT v,ord,public.shared_exercice_key(v) k FROM jsonb_array_elements(v_new_list) WITH ORDINALITY t(v,ord)) n
  WHERE n.v->>'id' IS NOT NULL AND (NOT (v_old_by_key ? n.k) OR ((v_old_by_key->n.k)-'actif') IS DISTINCT FROM (n.v-'actif'));
 IF jsonb_array_length(v_old_list)>0 THEN
 SELECT coalesce(array_agg(public.shared_exercice_strict_key(e) ORDER BY ord),ARRAY[]::text[]) INTO v_removed FROM jsonb_array_elements(v_old_list) WITH ORDINALITY t(e,ord)
 WHERE e->>'id' IS NOT NULL AND public.shared_exercice_strict_key(e) IS NOT NULL AND public.shared_exercice_key(e) <> ALL (SELECT public.shared_exercice_key(n) FROM jsonb_array_elements(v_new_list) n);
 END IF;
 IF jsonb_array_length(v_changed)=0 AND coalesce(array_length(v_removed,1),0)=0 THEN RETURN NULL; END IF;
 SELECT coalesce(jsonb_object_agg(k,c),'{}'::jsonb), coalesce(array_agg(k),ARRAY[]::text[]) INTO v_changed_by_key, v_changed_keys FROM (
   SELECT DISTINCT ON (k) k,c FROM (SELECT public.shared_exercice_key(c) k,c,ord FROM jsonb_array_elements(v_changed) WITH ORDINALITY t(c,ord)) s ORDER BY k,ord) f;
 PERFORM set_config('app.shared_exercice_sync','1',true);
 -- Only modules containing a changed or removed shared exercise can be modified; others are skipped without rebuilding.
 FOR v_target IN SELECT t.module_id,t.module_data FROM public.module_editor_state t WHERE t.module_id<>NEW.module_id AND jsonb_typeof(coalesce(t.module_data->'exercices','null'::jsonb))='array' AND jsonb_array_length(t.module_data->'exercices')>0
 AND EXISTS (SELECT 1 FROM jsonb_array_elements(t.module_data->'exercices') te WHERE te->>'id' IS NOT NULL AND (public.shared_exercice_key(te)=ANY(v_changed_keys) OR public.shared_exercice_strict_key(te)=ANY(v_removed)))
 ORDER BY t.module_id LOOP
 v_touched:=false; v_new_exos:='[]'::jsonb; v_target_list:='[]'::jsonb;
 FOR v_exo IN SELECT value FROM jsonb_array_elements(v_target.module_data->'exercices') LOOP
 IF v_exo->>'id' IS NOT NULL AND public.shared_exercice_strict_key(v_exo) IS NOT NULL AND public.shared_exercice_strict_key(v_exo)=ANY(v_removed) THEN v_touched:=true; CONTINUE; END IF;
 v_repl:=NULL;
 IF v_exo->>'id' IS NOT NULL THEN v_key:=public.shared_exercice_key(v_exo); v_repl:=v_changed_by_key->v_key; END IF;
 IF v_repl IS NOT NULL THEN
 v_old_source:=v_old_by_key->v_key;
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
 -- 07/11/2026 : une question présente dans l'ANCIENNE version source mais absente de la cible a été
 -- retirée volontairement dans la cible (ex. TAXI 10/62 Q40-Q41 le 05/11 14:19) : la propagation
 -- d'une autre modification ne doit jamais la réintroduire. Seules les questions NOUVELLES de la
 -- source (absentes de son ancienne version) peuvent être ajoutées. Aucune question n'est retirée ici.
 IF v_repl IS NOT NULL AND v_old_source IS NOT NULL AND jsonb_typeof(v_repl->'questions')='array' AND jsonb_typeof(v_old_source->'questions')='array' THEN
 SELECT coalesce(jsonb_agg(nq ORDER BY ord),'[]'::jsonb) INTO v_partial FROM jsonb_array_elements(v_repl->'questions') WITH ORDINALITY n(nq,ord)
 WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(public.jsonb_as_array(v_exo->'questions')) tq WHERE tq->>'id'=nq->>'id')
 OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_old_source->'questions') oq WHERE oq->>'id'=nq->>'id');
 v_repl:=jsonb_set(v_repl,'{questions}',v_partial);
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
