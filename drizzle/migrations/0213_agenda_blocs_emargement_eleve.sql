-- Lecture seule : blocs d'agenda (horaires uniquement) des semaines couvertes par les sessions
-- d'un apprenant, pour calculer ses feuilles d'émargement dues. Les élèves n'ont pas accès
-- à la table agenda_blocs (réservée Admin) ; aucune écriture, aucune donnée formateur exposée.
CREATE OR REPLACE FUNCTION public.agenda_blocs_emargement_eleve(p_apprenant_id uuid)
RETURNS TABLE(id uuid, semaine_debut date, jour integer, heure_debut text, heure_fin text, formation text, publics_cibles text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.semaine_debut, b.jour, b.heure_debut, b.heure_fin, b.formation, b.publics_cibles
  FROM public.agenda_blocs b
  WHERE auth.uid() IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (SELECT 1 FROM public.apprenants a WHERE a.id = p_apprenant_id AND a.auth_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.emargement_dossiers_lies l WHERE l.apprenant_id = p_apprenant_id AND l.auth_user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1
      FROM public.session_apprenants sa
      JOIN public.sessions s ON s.id = sa.session_id
      WHERE sa.apprenant_id = p_apprenant_id
        AND s.date_debut IS NOT NULL
        AND b.semaine_debut + 6 >= s.date_debut
        AND b.semaine_debut <= COALESCE(s.date_fin, s.date_debut)
    )
  ORDER BY b.semaine_debut, b.jour, b.heure_debut, b.id
$$;

REVOKE ALL ON FUNCTION public.agenda_blocs_emargement_eleve(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agenda_blocs_emargement_eleve(uuid) TO authenticated, service_role;