-- CANDIDAT NON EXECUTE : 2 références seulement, aucun contenu/question/corrigé/note modifié.
-- Relecture et autorisation avant exécution. Toute divergence annule tout le bloc.
DO $$
DECLARE r record; l public.bilan_sync_liens%ROWTYPE; v jsonb; t jsonb; n int;
BEGIN
 PERFORM 1 FROM public.module_editor_state WHERE module_id IN (5,11) ORDER BY module_id FOR UPDATE;
 FOR r IN SELECT * FROM (VALUES
  ('75e88f32-de34-4ba2-9a1d-6484ac1dc7fd'::uuid,'89a3ea2e910b7f55b83cd13f3062b601','74958981d6bcb5ceaf7dfbcb153bca25'),
  ('8fb2495b-96a0-403a-969a-47ec536c6e9e'::uuid,'a0978afbef4399dd804abf99247d456a','c45271e12ec4da5e6ac141d769228ef0')
 ) x(id,ancien,nouveau) LOOP
  SELECT * INTO l FROM public.bilan_sync_liens WHERE id=r.id FOR UPDATE;
  IF NOT FOUND OR l.statut<>'liee' OR l.matiere_key<>'bilan_francais' THEN RAISE EXCEPTION 'REFERENCE_BILAN_HORS_LOT'; END IF;
  SELECT count(*),(array_agg(q))[1] INTO n,v FROM public.module_editor_state m,
   LATERAL jsonb_array_elements(m.module_data->'exercices') e,
   LATERAL jsonb_array_elements(e->'questions') q
   WHERE m.module_id=l.vtc_module_id AND e->>'id'=l.vtc_exercice_id::text AND q->>'id'=l.vtc_question_id::text;
  IF n<>1 THEN RAISE EXCEPTION 'REFERENCE_BILAN_SOURCE_AMBIGUE'; END IF;
  SELECT count(*),(array_agg(q))[1] INTO n,t FROM public.module_editor_state m,
   LATERAL jsonb_array_elements(m.module_data->'exercices') e,
   LATERAL jsonb_array_elements(e->'questions') q
   WHERE m.module_id=l.taxi_module_id AND e->>'id'=l.taxi_exercice_id::text AND q->>'id'=l.taxi_question_id::text;
  IF n<>1 OR public.bilan_sync_payload(v) IS DISTINCT FROM public.bilan_sync_payload(t)
     OR public.bilan_sync_empreinte(v) IS DISTINCT FROM r.nouveau THEN RAISE EXCEPTION 'REFERENCE_BILAN_CONTENU_CHANGE'; END IF;
  IF l.empreinte_vtc_ref=r.nouveau AND l.empreinte_taxi_ref=r.nouveau THEN CONTINUE; END IF;
  IF l.empreinte_vtc_ref IS DISTINCT FROM r.ancien OR l.empreinte_taxi_ref IS DISTINCT FROM r.ancien THEN RAISE EXCEPTION 'REFERENCE_BILAN_CONFLIT'; END IF;
  UPDATE public.bilan_sync_liens SET empreinte_vtc_ref=r.nouveau,empreinte_taxi_ref=r.nouveau WHERE id=l.id;
  INSERT INTO public.bilan_sync_journal(lien_id,evenement,sens,source_module_id,cible_module_id,question_id,avant,apres,empreinte_avant,empreinte_apres,auteur,motif)
  VALUES(l.id,'reference_reconciliee',NULL,l.vtc_module_id,l.taxi_module_id,l.vtc_question_id,
    jsonb_build_object('vtc',l.empreinte_vtc_ref,'taxi',l.empreinte_taxi_ref),jsonb_build_object('vtc',r.nouveau,'taxi',r.nouveau),
    r.ancien,r.nouveau,auth.uid(),'Relecture 26/11 : payloads des deux questions strictement égaux, contenu inchangé; référence seule, historique conservé');
 END LOOP;
END $$;