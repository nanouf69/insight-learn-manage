-- ÉTAPE 2 (PRÉPARATION, NON ACTIVÉE) : changement de mot de passe obligatoire.
-- Aucune ligne n'est créée ici : tant que la table est vide, personne n'est concerné.
CREATE TABLE public.apprenant_changement_mdp_requis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL UNIQUE REFERENCES public.apprenants(id) ON DELETE CASCADE,
  motif text NOT NULL DEFAULT 'ancien_mot_de_passe_expose',
  lot text,
  demande_le timestamptz NOT NULL DEFAULT now(),
  demande_par uuid,
  effectue_le timestamptz,
  annule_le timestamptz,
  annule_par uuid
);

GRANT SELECT ON public.apprenant_changement_mdp_requis TO authenticated;
GRANT ALL ON public.apprenant_changement_mdp_requis TO service_role;

ALTER TABLE public.apprenant_changement_mdp_requis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins lisent les demandes de changement"
  ON public.apprenant_changement_mdp_requis FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.apprenant_changement_mdp_requis IS
  'Étape 2 sécurité des accès : ne contient JAMAIS de mot de passe. Une ligne active (effectue_le et annule_le nuls) = changement demandé à la prochaine connexion.';

-- Examen blanc en cours pour un apprenant (ancien circuit + noyau V2), avec marge de 30 min.
CREATE OR REPLACE FUNCTION public.apprenant_examen_blanc_en_cours(_apprenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.apprenant_examen_timers t
    WHERE t.apprenant_id = _apprenant_id
      AND t.started_at IS NOT NULL
      AND t.started_at + make_interval(secs => COALESCE(t.duree_secondes, 0)) + interval '30 minutes' > now()
  ) OR EXISTS (
    SELECT 1 FROM public.exam_attempts_v2 a
    WHERE a.apprenant_id = _apprenant_id
      AND a.finished_at IS NULL
      AND a.started_at > now() - interval '24 hours'
  )
$$;

-- État pour l'apprenant connecté : demande active ? examen en cours ?
CREATE OR REPLACE FUNCTION public.mon_changement_mdp_requis()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _app uuid; _req boolean;
BEGIN
  SELECT id INTO _app FROM public.apprenants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF _app IS NULL THEN RETURN jsonb_build_object('requis', false, 'examen_en_cours', false); END IF;
  SELECT EXISTS (SELECT 1 FROM public.apprenant_changement_mdp_requis
                 WHERE apprenant_id = _app AND effectue_le IS NULL AND annule_le IS NULL) INTO _req;
  RETURN jsonb_build_object(
    'requis', _req,
    'examen_en_cours', CASE WHEN _req THEN public.apprenant_examen_blanc_en_cours(_app) ELSE false END
  );
END $$;

-- Appelée après un changement de mot de passe réussi (le mot de passe n'y transite jamais).
CREATE OR REPLACE FUNCTION public.confirmer_changement_mdp_effectue()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _app uuid; _n int;
BEGIN
  SELECT id INTO _app FROM public.apprenants WHERE auth_user_id = auth.uid() LIMIT 1;
  IF _app IS NULL THEN RETURN false; END IF;
  UPDATE public.apprenant_changement_mdp_requis SET effectue_le = now()
   WHERE apprenant_id = _app AND effectue_le IS NULL AND annule_le IS NULL;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n > 0;
END $$;

REVOKE ALL ON FUNCTION public.apprenant_examen_blanc_en_cours(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apprenant_examen_blanc_en_cours(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.mon_changement_mdp_requis() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mon_changement_mdp_requis() TO authenticated;
REVOKE ALL ON FUNCTION public.confirmer_changement_mdp_effectue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmer_changement_mdp_effectue() TO authenticated;
