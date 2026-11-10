CREATE TABLE public.qrc_commentaires_rapides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texte text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  archive boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  updated_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qrc_commentaires_texte_valide CHECK (length(btrim(texte)) > 0)
);
GRANT SELECT ON public.qrc_commentaires_rapides TO authenticated;
GRANT ALL ON public.qrc_commentaires_rapides TO service_role;
ALTER TABLE public.qrc_commentaires_rapides ENABLE ROW LEVEL SECURITY;
CREATE POLICY qrc_commentaires_lecture_admin ON public.qrc_commentaires_rapides
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.qrc_commentaire_rapide_enregistrer(
  p_id uuid, p_texte text, p_version integer DEFAULT NULL, p_archive boolean DEFAULT false
) RETURNS public.qrc_commentaires_rapides
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.qrc_commentaires_rapides;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL OR p_texte IS NULL OR length(btrim(p_texte)) = 0 OR p_archive IS NULL THEN
    RAISE EXCEPTION 'Saisissez un commentaire non vide' USING ERRCODE = '22023';
  END IF;
  -- Serialize creation and edits for the same immutable identity (including double clicks).
  PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  SELECT * INTO r FROM public.qrc_commentaires_rapides WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    IF p_version IS NOT NULL OR p_archive THEN
      RAISE EXCEPTION 'Mot-clé introuvable' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.qrc_commentaires_rapides(id, texte) VALUES (p_id, p_texte) RETURNING * INTO r;
  ELSE
    IF r.texte = p_texte AND r.archive = p_archive AND
       (p_version = r.version OR p_version = r.version - 1 OR (p_version IS NULL AND r.version = 1)) THEN
      RETURN r; -- Replayed identical request: no duplicate, no version increment.
    END IF;
    IF p_version IS NULL OR p_version <> r.version OR r.archive THEN
      RAISE EXCEPTION 'Ce mot-clé a été modifié par un autre administrateur. Relisez la liste.' USING ERRCODE = 'P0551';
    END IF;
    UPDATE public.qrc_commentaires_rapides SET texte = p_texte, archive = p_archive,
      version = version + 1, updated_by = auth.uid(), updated_at = now()
      WHERE id = p_id RETURNING * INTO r;
  END IF;
  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.qrc_commentaire_rapide_enregistrer(uuid,text,integer,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qrc_commentaire_rapide_enregistrer(uuid,text,integer,boolean) TO authenticated, service_role;
COMMENT ON TABLE public.qrc_commentaires_rapides IS 'Shared admin QRC quick comments. Removal archives only; saved learner comments are independent immutable text.';