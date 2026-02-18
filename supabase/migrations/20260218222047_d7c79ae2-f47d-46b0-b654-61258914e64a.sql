
-- Supprimer les doublons restants en gardant le plus ancien
DELETE FROM agenda_blocs
WHERE id NOT IN (
  SELECT DISTINCT ON (semaine_debut, jour, heure_debut, heure_fin, discipline_nom, formation, formateur_id) id
  FROM agenda_blocs
  ORDER BY semaine_debut, jour, heure_debut, heure_fin, discipline_nom, formation, formateur_id, created_at ASC
);

-- Ajouter une contrainte unique pour empêcher tout futur doublon
ALTER TABLE agenda_blocs
ADD CONSTRAINT agenda_blocs_unique_bloc
UNIQUE (semaine_debut, jour, heure_debut, heure_fin, discipline_nom, formation, formateur_id);
