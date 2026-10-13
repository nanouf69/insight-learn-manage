CREATE TABLE public.releve_jalons_gels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  payload jsonb NOT NULL,
  empreinte text NOT NULL CHECK (length(empreinte) = 64),
  methode text NOT NULL,
  motif text NOT NULL CHECK (length(btrim(motif)) >= 5),
  date_fin_formation date NOT NULL,
  remplace_gel_id uuid REFERENCES public.releve_jalons_gels(id),
  cree_par uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (apprenant_id, version)
);
GRANT SELECT ON public.releve_jalons_gels TO authenticated;
GRANT ALL ON public.releve_jalons_gels TO service_role;
ALTER TABLE public.releve_jalons_gels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins lisent les gels de relevé" ON public.releve_jalons_gels
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.releve_jalons_gels_immuable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Relevé figé : archive immuable (aucune modification ni suppression)' USING ERRCODE = 'P0520';
END $$;
CREATE TRIGGER trg_releve_jalons_gels_immuable BEFORE UPDATE OR DELETE ON public.releve_jalons_gels
  FOR EACH ROW EXECUTE FUNCTION public.releve_jalons_gels_immuable();

-- Création uniquement par un admin, formation réellement terminée, idempotente,
-- nouvelle version seulement si explicitement demandée (l'ancienne reste).
CREATE OR REPLACE FUNCTION public.figer_releve_jalons(
  _apprenant_id uuid, _payload jsonb, _empreinte text, _methode text, _motif text,
  _nouvelle_version boolean DEFAULT false
) RETURNS public.releve_jalons_gels
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _fin date; _dernier public.releve_jalons_gels; _row public.releve_jalons_gels;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès administrateur requis' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(date_fin_cours_en_ligne, date_fin_formation) INTO _fin FROM public.apprenants WHERE id = _apprenant_id;
  IF _fin IS NULL THEN RAISE EXCEPTION 'Date de fin de formation non renseignée' USING ERRCODE = 'P0521'; END IF;
  IF _fin >= (now() AT TIME ZONE 'Europe/Paris')::date THEN
    RAISE EXCEPTION 'Formation non terminée : clôture refusée' USING ERRCODE = 'P0522';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('releve_gel:' || _apprenant_id::text));
  SELECT * INTO _dernier FROM public.releve_jalons_gels WHERE apprenant_id = _apprenant_id ORDER BY version DESC LIMIT 1;
  IF FOUND THEN
    IF _dernier.empreinte = _empreinte OR NOT _nouvelle_version THEN
      RETURN _dernier; -- réessai idempotent : l'archive existante n'est jamais remplacée
    END IF;
  END IF;
  INSERT INTO public.releve_jalons_gels (apprenant_id, version, payload, empreinte, methode, motif, date_fin_formation, remplace_gel_id, cree_par)
  VALUES (_apprenant_id, COALESCE(_dernier.version, 0) + 1, _payload, _empreinte, _methode, _motif, _fin, _dernier.id, auth.uid())
  RETURNING * INTO _row;
  RETURN _row;
END $$;
REVOKE ALL ON FUNCTION public.figer_releve_jalons(uuid, jsonb, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.figer_releve_jalons(uuid, jsonb, text, text, text, boolean) TO authenticated;