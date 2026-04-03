ALTER TABLE public.session_apprenants
ADD COLUMN date_fin_personnalisee DATE DEFAULT NULL,
ADD COLUMN heure_debut_personnalisee TEXT DEFAULT NULL,
ADD COLUMN heure_fin_personnalisee TEXT DEFAULT NULL;