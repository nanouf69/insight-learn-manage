CREATE SEQUENCE IF NOT EXISTS public.bilan_question_numero_seq START 100000;
GRANT USAGE ON SEQUENCE public.bilan_question_numero_seq TO service_role;
DROP FUNCTION IF EXISTS public.bilan_identite_creer(int,int,jsonb);
CREATE FUNCTION public.bilan_identite_creer(p_module_id int, p_exercice_id int, p_question jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid := gen_random_uuid(); v_num text; v_q jsonb; v_h text;
BEGIN
  -- numéro technique jamais réutilisé : séquence globale, enregistré à vie dans le registre
  v_num := nextval('bilan_question_numero_seq')::text;
  v_q := jsonb_set(jsonb_set(COALESCE(p_question,'{}'::jsonb), '{id}', to_jsonb(v_num::bigint)), '{uid}', to_jsonb(v::text));
  v_h := md5((v_q - 'uid' - 'id')::text);
  INSERT INTO bilan_question_identites(uid, module_id, filiere, exercice_id, numero_technique, empreinte_contenu, etat_initial, date_connue)
  VALUES (v, p_module_id, CASE p_module_id WHEN 5 THEN 'VTC' WHEN 11 THEN 'TAXI' ELSE 'TEST' END, p_exercice_id, v_num, v_h, 'actif', now());
  INSERT INTO bilan_question_identite_etats(uid, etat, numero_affiche, empreinte_contenu, motif) VALUES (v, 'actif', v_num, v_h, 'création');
  RETURN v_q;
END $$;
REVOKE ALL ON FUNCTION public.bilan_identite_creer(int,int,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bilan_identite_creer(int,int,jsonb) TO service_role;