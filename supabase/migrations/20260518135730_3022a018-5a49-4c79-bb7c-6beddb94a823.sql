
DELETE FROM agenda_blocs WHERE semaine_debut = '2026-05-18';

INSERT INTO agenda_blocs (formateur_id, discipline_id, discipline_nom, discipline_color, formation, jour, heure_debut, heure_fin, semaine_debut, publics_cibles)
SELECT formateur_id, discipline_id, discipline_nom, discipline_color, formation, jour, heure_debut, heure_fin, '2026-05-18'::date, publics_cibles
FROM agenda_blocs
WHERE semaine_debut = '2026-03-16';
