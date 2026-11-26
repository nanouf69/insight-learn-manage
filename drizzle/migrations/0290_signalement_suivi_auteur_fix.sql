CREATE OR REPLACE FUNCTION public.signalement_ajouter_suivi(_signalement_id uuid, _nature text, _contenu text, _nouveau_statut text, _visible_apprenant boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_ancien text; v_nom text; v_id uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin') THEN RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501'; END IF;
  IF _nature NOT IN ('statut','analyse','reponse','mesure','note_interne') THEN RAISE EXCEPTION 'Nature invalide' USING ERRCODE = '22023'; END IF;
  IF _nouveau_statut IS NOT NULL AND _nouveau_statut NOT IN ('recu','en_cours','traite') THEN RAISE EXCEPTION 'Statut invalide' USING ERRCODE = '22023'; END IF;
  IF _nature <> 'statut' AND coalesce(btrim(_contenu),'') = '' THEN RAISE EXCEPTION 'Texte obligatoire' USING ERRCODE = '22023'; END IF;
  SELECT statut INTO v_ancien FROM public.signalements_apprenants WHERE id = _signalement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket introuvable' USING ERRCODE = 'P0002'; END IF;
  SELECT coalesce((SELECT nullif(btrim(p.full_name),'') FROM public.profiles p WHERE p.user_id = u.id LIMIT 1), u.email) INTO v_nom
    FROM auth.users u WHERE u.id = v_uid;
  INSERT INTO public.signalements_suivi(signalement_id, nature, contenu, statut_avant, statut_apres, visible_apprenant, auteur_id, auteur_nom)
  VALUES (_signalement_id, _nature, nullif(btrim(coalesce(_contenu,'')),''), v_ancien,
          coalesce(_nouveau_statut, v_ancien), CASE WHEN _nature = 'note_interne' THEN false ELSE coalesce(_visible_apprenant,false) END, v_uid, v_nom)
  RETURNING id INTO v_id;
  IF _nouveau_statut IS NOT NULL AND _nouveau_statut <> v_ancien THEN
    UPDATE public.signalements_apprenants SET statut = _nouveau_statut, statut_modifie_le = now(), statut_modifie_par = v_uid WHERE id = _signalement_id;
  END IF;
  RETURN v_id;
END $$;