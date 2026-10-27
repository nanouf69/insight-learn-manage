CREATE TABLE public.session_calendrier_jours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  jour date NOT NULL,
  plages jsonb NOT NULL DEFAULT '[]'::jsonb,
  nature text NOT NULL DEFAULT 'cours' CHECK (nature IN ('cours','pratique','examen')),
  libelle text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, jour, nature),
  CHECK (jsonb_typeof(plages) = 'array')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_calendrier_jours TO authenticated;
GRANT ALL ON public.session_calendrier_jours TO service_role;
ALTER TABLE public.session_calendrier_jours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerent calendrier devis" ON public.session_calendrier_jours
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Lecture publique limitée : uniquement des informations catalogue (aucune donnée élève).
CREATE OR REPLACE FUNCTION public.sessions_publiques_devis()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id, 'nom', s.nom, 'type_session', s.type_session,
    'date_debut', s.date_debut, 'date_fin', s.date_fin,
    'heure_debut', s.heure_debut, 'heure_fin', s.heure_fin,
    'heures_total', s.heures_total, 'lieu', s.lieu,
    'types_apprenant', s.types_apprenant,
    'jours', COALESCE((SELECT jsonb_agg(jsonb_build_object('jour', j.jour, 'plages', j.plages, 'nature', j.nature, 'libelle', j.libelle) ORDER BY j.jour, j.nature)
              FROM public.session_calendrier_jours j WHERE j.session_id = s.id), '[]'::jsonb)
  ) ORDER BY s.date_debut), '[]'::jsonb)
  FROM public.sessions s
  WHERE s.date_fin >= current_date
    AND COALESCE(s.statut, '') NOT IN ('annulee','annulée','terminee','terminée');
$$;
REVOKE ALL ON FUNCTION public.sessions_publiques_devis() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sessions_publiques_devis() TO anon, authenticated, service_role;