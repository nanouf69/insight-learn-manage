
-- Ajouter les colonnes horaires à la table sessions
ALTER TABLE public.sessions 
ADD COLUMN heure_debut text,
ADD COLUMN heure_fin text;

COMMENT ON COLUMN public.sessions.heure_debut IS 'Heure de début de la session (ex: 09:00)';
COMMENT ON COLUMN public.sessions.heure_fin IS 'Heure de fin de la session (ex: 16:00)';
