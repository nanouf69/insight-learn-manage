-- Verrou attestations formation continue : 4 signatures serveur (matin + après-midi de chaque jour de la session FC).
CREATE OR REPLACE FUNCTION public.attestation_fc_controle(p_apprenant uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE s record; d date; c text; manquants jsonb := '[]'::jsonb; requis int := 0; signes int := 0;
BEGIN
  IF p_apprenant IS NULL THEN RETURN jsonb_build_object('autorise', false, 'motif', 'Apprenant inconnu', 'manquants', '[]'::jsonb); END IF;
  SELECT se.id, se.nom, se.date_debut::date AS dd, coalesce(se.date_fin, se.date_debut)::date AS df INTO s
  FROM session_apprenants sa JOIN sessions se ON se.id = sa.session_id
  WHERE sa.apprenant_id = p_apprenant AND coalesce(sa.liste_attente, false) = false
    AND se.nom ILIKE '%formation continue%' AND se.date_debut IS NOT NULL
  ORDER BY se.date_debut DESC LIMIT 1;
  IF s.id IS NULL THEN
    RETURN jsonb_build_object('autorise', false, 'motif', 'Aucune session de formation continue trouvée', 'manquants', '[]'::jsonb);
  END IF;
  FOR d IN SELECT g::date FROM generate_series(s.dd, s.df, interval '1 day') g WHERE extract(isodow FROM g) < 6 LOOP
    FOREACH c IN ARRAY ARRAY['matin','apres_midi'] LOOP
      requis := requis + 1;
      IF EXISTS (SELECT 1 FROM emargements_fc e WHERE e.apprenant_id = p_apprenant AND e.date_emargement = d AND e.demi_journee = c
                 AND coalesce(e.masque, false) = false AND coalesce(e.absent, false) = false AND e.signed_at IS NOT NULL
                 AND e.signature_data_url ~* '^data:image/(png|jpeg|jpg);base64,[a-z0-9+/=[:space:]]+$'
                 AND length(e.signature_data_url) > 200) THEN
        signes := signes + 1;
      ELSE
        manquants := manquants || jsonb_build_object('date', d, 'creneau', c);
      END IF;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('autorise', requis > 0 AND signes = requis, 'requis', requis, 'signes', signes,
    'session_id', s.id, 'session', s.nom, 'manquants', manquants,
    'motif', CASE WHEN requis = 0 THEN 'Aucun jour de formation dans la session' WHEN signes = requis THEN NULL ELSE 'Émargements manquants' END);
END $$;

-- Accès : administrateurs, ou l'élève lui-même pour son propre dossier.
CREATE OR REPLACE FUNCTION public.attestation_fc_autorisee(p_apprenant uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM apprenants a WHERE a.id = p_apprenant AND a.user_id = auth.uid())) THEN
    RETURN jsonb_build_object('autorise', false, 'motif', 'Accès refusé', 'manquants', '[]'::jsonb);
  END IF;
  RETURN public.attestation_fc_controle(p_apprenant);
END $$;
REVOKE ALL ON FUNCTION public.attestation_fc_controle(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attestation_fc_controle(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.attestation_fc_autorisee(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attestation_fc_autorisee(uuid) TO authenticated, service_role;

-- Aucun enregistrement d'attestation FC dans le dossier sans les signatures requises.
CREATE OR REPLACE FUNCTION public.garde_attestation_fc_emargements()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r jsonb;
BEGIN
  IF NEW.type_document IS DISTINCT FROM 'attestation-fc' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.type_document = 'attestation-fc' AND NEW.url IS NOT DISTINCT FROM OLD.url THEN RETURN NEW; END IF;
  r := public.attestation_fc_controle(NEW.apprenant_id);
  IF coalesce((r->>'autorise')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Attestation formation continue refusée : % (%/% signatures)', coalesce(r->>'motif','émargements manquants'), coalesce(r->>'signes','0'), coalesce(r->>'requis','?')
      USING ERRCODE = 'P0540';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_garde_attestation_fc_emargements BEFORE INSERT OR UPDATE ON public.documents_inscription
  FOR EACH ROW EXECUTE FUNCTION public.garde_attestation_fc_emargements();