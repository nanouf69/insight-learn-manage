
-- Ajouter un champ type_session pour distinguer théorique et pratique
ALTER TABLE public.sessions 
ADD COLUMN type_session text NOT NULL DEFAULT 'theorique';

-- Mettre à jour les sessions existantes (toutes sont théoriques par défaut)
COMMENT ON COLUMN public.sessions.type_session IS 'Type de session: theorique ou pratique';
