CREATE TABLE public.facture_apprenants_rattachements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id uuid NOT NULL,
  apprenant_id uuid NOT NULL,
  nom_apprenant text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  UNIQUE (facture_id, apprenant_id)
);
GRANT SELECT ON public.facture_apprenants_rattachements TO authenticated;
GRANT ALL ON public.facture_apprenants_rattachements TO service_role;
ALTER TABLE public.facture_apprenants_rattachements ENABLE ROW LEVEL SECURITY;
CREATE POLICY rattachements_admin_lecture ON public.facture_apprenants_rattachements FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE FUNCTION public.facture_rattachements_immutables() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Les rattachements enregistrés sont conservés.' USING ERRCODE = '42501';
END;
$$;
CREATE TRIGGER rattachements_immutables BEFORE UPDATE OR DELETE ON public.facture_apprenants_rattachements FOR EACH ROW EXECUTE FUNCTION public.facture_rattachements_immutables();
REVOKE ALL ON FUNCTION public.facture_rattachements_immutables() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.facture_rattacher_apprenants(_facture_id uuid, _apprenant_ids uuid[]) RETURNS SETOF public.facture_apprenants_rattachements LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_facture public.factures%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès administrateur requis.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_facture FROM public.factures WHERE id = _facture_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture introuvable.' USING ERRCODE = '22023'; END IF;
  IF _apprenant_ids IS NULL OR cardinality(_apprenant_ids) = 0 OR array_position(_apprenant_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Sélectionnez au moins un apprenant.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(_apprenant_ids) x(id) WHERE NOT EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = x.id AND a.deleted_at IS NULL)) THEN
    RAISE EXCEPTION 'Apprenant introuvable ou archivé.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.facture_apprenants_rattachements(facture_id, apprenant_id, nom_apprenant, created_by)
  SELECT _facture_id, a.id, trim(concat_ws(' ', a.prenom, a.nom)), auth.uid()
  FROM public.apprenants a
  WHERE a.id = ANY(_apprenant_ids)
    AND a.id IS DISTINCT FROM v_facture.apprenant_id
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(v_facture.lignes_apprenants, '[]'::jsonb)) l WHERE l->>'apprenant_id' = a.id::text)
  ON CONFLICT(facture_id, apprenant_id) DO NOTHING;
  RETURN QUERY SELECT r.* FROM public.facture_apprenants_rattachements r WHERE r.facture_id = _facture_id ORDER BY r.created_at, r.id;
END;
$$;
REVOKE ALL ON FUNCTION public.facture_rattacher_apprenants(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.facture_rattacher_apprenants(uuid, uuid[]) TO authenticated;
COMMENT ON TABLE public.facture_apprenants_rattachements IS 'Administrative append-only links only: no invoice line, amount, payment allocation, learner access or training evidence is inferred.';