-- Ajouter les cours de mai manquants en copiant uniquement les cours existants de mars
-- Décalage de 8 semaines : mars 2026 -> mai 2026
INSERT INTO public.agenda_blocs (
  formateur_id,
  discipline_id,
  discipline_nom,
  discipline_color,
  formation,
  jour,
  heure_debut,
  heure_fin,
  semaine_debut
)
SELECT
  formateur_id,
  discipline_id,
  discipline_nom,
  discipline_color,
  formation,
  jour,
  heure_debut,
  heure_fin,
  (semaine_debut + interval '56 days')::date AS semaine_debut
FROM public.agenda_blocs
WHERE semaine_debut IN ('2026-03-09', '2026-03-16', '2026-03-23', '2026-03-30')
  AND COALESCE(discipline_nom, '') !~* 'examen'
  AND COALESCE(formation, '') !~* 'examen'
ON CONFLICT ON CONSTRAINT agenda_blocs_unique_bloc DO NOTHING;