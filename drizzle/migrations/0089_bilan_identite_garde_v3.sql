CREATE OR REPLACE FUNCTION public.bilan_identite_garde()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_bad text; v_exos jsonb := '[]'::jsonb; v_e jsonb; v_q jsonb; v_qs jsonb; v_ex int; v_num text;
  v_uid uuid; v_reg bilan_question_identites%ROWTYPE; v_in_old boolean; v_plancher bigint; v_h text;
  v_fil text := CASE NEW.module_id WHEN 5 THEN 'VTC' WHEN 11 THEN 'TAXI' ELSE 'TEST' END;
BEGIN
  IF NOT COALESCE((SELECT actif FROM bilan_identite_flags WHERE module_id = NEW.module_id), false) THEN RETURN NEW; END IF;

  -- 1. Attribution serveur des identités manquantes
  FOR v_e IN SELECT ex_j FROM jsonb_array_elements(COALESCE(NEW.module_data->'exercices','[]'::jsonb)) ex_j LOOP
    v_ex := (v_e->>'id')::int; v_qs := '[]'::jsonb;
    FOR v_q IN SELECT q_j FROM jsonb_array_elements(COALESCE(v_e->'questions','[]'::jsonb)) q_j LOOP
      IF v_q->>'uid' IS NULL THEN
        v_num := v_q->>'id';
        SELECT * INTO v_reg FROM bilan_question_identites WHERE module_id = NEW.module_id AND exercice_id = v_ex AND numero_technique = v_num;
        IF FOUND THEN
          v_in_old := TG_OP = 'UPDATE' AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(OLD.module_data->'exercices','[]'::jsonb)) oe,
                          jsonb_array_elements(COALESCE(oe->'questions','[]'::jsonb)) oq
            WHERE (oe->>'id')::int = v_ex AND oq->>'id' = v_num AND oq->>'uid' = v_reg.uid::text);
          IF v_in_old AND NOT v_reg.litigieux THEN
            v_q := v_q || jsonb_build_object('uid', v_reg.uid::text);
          ELSE
            RAISE EXCEPTION 'Identités de questions Bilan : le numéro technique %-% est réservé à une autre question (supprimée, masquée ou historique) et ne peut jamais être réutilisé. Rechargez la page avant d''ajouter une question. Aucune modification enregistrée.', v_ex, v_num USING ERRCODE = 'P0497';
          END IF;
        ELSE
          v_uid := gen_random_uuid();
          v_h := md5((v_q - 'uid')::text);
          INSERT INTO bilan_question_identites(uid, module_id, filiere, exercice_id, matiere, numero_technique, empreinte_contenu, etat_initial, motif, date_connue)
          VALUES (v_uid, NEW.module_id, v_fil, v_ex, v_e->>'titre', v_num, v_h, 'actif', 'création éditeur', now());
          INSERT INTO bilan_question_identite_etats(uid, etat, numero_affiche, empreinte_contenu, motif) VALUES (v_uid, 'actif', v_num, v_h, 'création');
          v_q := v_q || jsonb_build_object('uid', v_uid::text);
        END IF;
      END IF;
      v_qs := v_qs || jsonb_build_array(v_q);
    END LOOP;
    IF jsonb_typeof(v_e->'questions') = 'array' THEN v_e := jsonb_set(v_e, '{questions}', v_qs); END IF;
    v_exos := v_exos || jsonb_build_array(v_e);
  END LOOP;
  IF jsonb_typeof(NEW.module_data->'exercices') = 'array' THEN
    NEW.module_data := jsonb_set(NEW.module_data, '{exercices}', v_exos);
  END IF;

  -- 2. Contrôles bloquants
  WITH qq AS (
    SELECT (ej->>'id')::int ex, xj->>'id' num, xj->>'uid' uid
    FROM jsonb_array_elements(COALESCE(NEW.module_data->'exercices','[]'::jsonb)) ej,
         jsonb_array_elements(COALESCE(ej->'questions','[]'::jsonb)) xj)
  SELECT string_agg(motif, ' ; ') INTO v_bad FROM (
    SELECT 'question sans identifiant permanent ('||qq.ex||'-'||qq.num||')' motif FROM qq WHERE qq.uid IS NULL
    UNION ALL SELECT 'identifiant inconnu ou d''une autre matière ('||qq.ex||'-'||qq.num||')' FROM qq
      WHERE qq.uid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bilan_question_identites i WHERE i.uid::text = qq.uid AND i.module_id = NEW.module_id AND i.exercice_id = qq.ex)
    UNION ALL SELECT 'identifiant en double ('||qq.uid||')' FROM qq WHERE qq.uid IS NOT NULL GROUP BY qq.uid HAVING count(*) > 1
    UNION ALL SELECT 'identité litigieuse réactivée ('||qq.ex||'-'||qq.num||')' FROM qq JOIN bilan_question_identites i ON i.uid::text = qq.uid WHERE i.litigieux
    UNION ALL SELECT 'numéro technique '||qq.ex||'-'||qq.num||' ne correspond pas à son identité' FROM qq
      JOIN bilan_question_identites i ON i.uid::text = qq.uid WHERE i.numero_technique <> qq.num
    UNION ALL SELECT 'numéro historique '||qq.ex||'-'||qq.num||' réattribué à une autre identité' FROM qq
      JOIN bilan_question_identites i ON i.module_id = NEW.module_id AND i.exercice_id = qq.ex AND i.numero_technique = qq.num
      WHERE qq.uid IS DISTINCT FROM i.uid::text
  ) z;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Identités de questions Bilan : %. Aucune modification enregistrée.', v_bad USING ERRCODE = 'P0497';
  END IF;

  -- 3. Plancher de numérotation exposé à l'éditeur
  v_exos := '[]'::jsonb;
  FOR v_e IN SELECT ex_j FROM jsonb_array_elements(COALESCE(NEW.module_data->'exercices','[]'::jsonb)) ex_j LOOP
    SELECT COALESCE(max(CASE WHEN numero_technique ~ '^\d+$' THEN numero_technique::bigint END),0) INTO v_plancher FROM bilan_question_identites
     WHERE module_id = NEW.module_id AND exercice_id = (v_e->>'id')::int;
    v_exos := v_exos || jsonb_build_array(v_e || jsonb_build_object('numero_plancher', v_plancher));
  END LOOP;
  IF jsonb_typeof(NEW.module_data->'exercices') = 'array' THEN
    NEW.module_data := jsonb_set(NEW.module_data, '{exercices}', v_exos);
  END IF;
  RETURN NEW;
END $function$;