CREATE OR REPLACE FUNCTION qcl_journaliser_module() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '');
  v_email text;
  v_type text;
  v_origine text;
  v_nom text := coalesce(NEW.module_data->>'nom', NEW.module_data->>'titre', OLD.module_data->>'nom');
  r record;
  v_moved text[] := '{}';
BEGIN
  IF OLD.module_data IS NOT DISTINCT FROM NEW.module_data THEN RETURN NEW; END IF;
  IF v_uid IS NOT NULL THEN
    v_type := 'humain'; SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  ELSIF v_role = 'service_role' THEN
    v_type := 'agent_ou_fonction';
  ELSE
    -- écriture directe en base ou traitement automatique : étiqueté « Agent »
    v_type := 'agent_ou_fonction';
  END IF;
  v_origine := CASE WHEN pg_trigger_depth() > 1 THEN 'déclencheur imbriqué' ELSE coalesce(nullif(v_role,''),'connexion directe') END;

  CREATE TEMP TABLE IF NOT EXISTS _qcl_old (k text, exo text, titre text, qid text, q jsonb, actif boolean) ON COMMIT DROP;
  CREATE TEMP TABLE IF NOT EXISTS _qcl_new (k text, exo text, titre text, qid text, q jsonb, actif boolean) ON COMMIT DROP;
  TRUNCATE _qcl_old; TRUNCATE _qcl_new;
  INSERT INTO _qcl_old SELECT (e->>'id')||'#'||(q->>'id'), e->>'id', e->>'titre', q->>'id', q, coalesce((e->>'actif')::boolean, true)
    FROM jsonb_array_elements(coalesce(OLD.module_data->'exercices','[]'::jsonb)) e,
         jsonb_array_elements(coalesce(e->'questions','[]'::jsonb)) q;
  INSERT INTO _qcl_new SELECT (e->>'id')||'#'||(q->>'id'), e->>'id', e->>'titre', q->>'id', q, coalesce((e->>'actif')::boolean, true)
    FROM jsonb_array_elements(coalesce(NEW.module_data->'exercices','[]'::jsonb)) e,
         jsonb_array_elements(coalesce(e->'questions','[]'::jsonb)) q;

  FOR r IN SELECT o.*, n.exo nexo, n.titre ntitre, n.q nq, n.k nk FROM _qcl_old o JOIN _qcl_new n
      ON n.qid = o.qid AND n.exo <> o.exo AND n.q->>'enonce' IS NOT DISTINCT FROM o.q->>'enonce'
     WHERE NOT EXISTS (SELECT 1 FROM _qcl_new x WHERE x.k = o.k)
       AND NOT EXISTS (SELECT 1 FROM _qcl_old y WHERE y.k = n.k) LOOP
    INSERT INTO question_change_log(module_id,module_nom,exercice_id,exercice_titre,question_id,type_changement,avant,apres,auteur_type,auteur_user_id,auteur_email,origine)
    VALUES (NEW.module_id,v_nom,r.nexo,r.ntitre,r.qid,'deplacement',
      jsonb_build_object('exercice',r.exo,'titre',r.titre,'question',r.q), jsonb_build_object('exercice',r.nexo,'titre',r.ntitre,'question',r.nq),
      v_type,v_uid,v_email,v_origine);
    v_moved := v_moved || r.k || r.nk;
  END LOOP;

  INSERT INTO question_change_log(module_id,module_nom,exercice_id,exercice_titre,question_id,type_changement,avant,apres,auteur_type,auteur_user_id,auteur_email,origine)
  SELECT NEW.module_id,v_nom,o.exo,o.titre,o.qid,'suppression',o.q,NULL,v_type,v_uid,v_email,v_origine
  FROM _qcl_old o WHERE NOT EXISTS (SELECT 1 FROM _qcl_new n WHERE n.k=o.k) AND NOT (o.k = ANY(v_moved));

  INSERT INTO question_change_log(module_id,module_nom,exercice_id,exercice_titre,question_id,type_changement,avant,apres,auteur_type,auteur_user_id,auteur_email,origine)
  SELECT NEW.module_id,v_nom,n.exo,n.titre,n.qid,'ajout',NULL,n.q,v_type,v_uid,v_email,v_origine
  FROM _qcl_new n WHERE NOT EXISTS (SELECT 1 FROM _qcl_old o WHERE o.k=n.k) AND NOT (n.k = ANY(v_moved));

  INSERT INTO question_change_log(module_id,module_nom,exercice_id,exercice_titre,question_id,type_changement,avant,apres,auteur_type,auteur_user_id,auteur_email,origine)
  SELECT NEW.module_id,v_nom,n.exo,n.titre,n.qid,
    CASE WHEN o.actif AND NOT n.actif THEN 'retrait'
         WHEN NOT o.actif AND n.actif THEN 'remise_en_ligne'
         WHEN o.q->'choix' IS DISTINCT FROM n.q->'choix' OR o.q->'reponseQRC' IS DISTINCT FROM n.q->'reponseQRC' OR o.q->'reponseCorrecte' IS DISTINCT FROM n.q->'reponseCorrecte' THEN 'modification_reponses'
         ELSE 'modification_texte' END,
    o.q,n.q,v_type,v_uid,v_email,v_origine
  FROM _qcl_new n JOIN _qcl_old o ON o.k=n.k
  WHERE o.q IS DISTINCT FROM n.q OR o.actif <> n.actif;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'qcl_journaliser_module: %', SQLERRM;
  RETURN NEW;
END $$;