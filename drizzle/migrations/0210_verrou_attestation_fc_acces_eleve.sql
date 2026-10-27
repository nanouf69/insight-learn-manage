CREATE OR REPLACE FUNCTION public.attestation_fc_autorisee(p_apprenant uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM apprenants a WHERE a.id = p_apprenant AND a.auth_user_id = auth.uid())) THEN
    RETURN jsonb_build_object('autorise', false, 'motif', 'Accès refusé', 'manquants', '[]'::jsonb);
  END IF;
  RETURN public.attestation_fc_controle(p_apprenant);
END $$;