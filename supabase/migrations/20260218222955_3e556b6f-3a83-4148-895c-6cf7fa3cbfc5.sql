
-- Ajouter la colonne presence à session_formateurs (d'office "present" par défaut)
ALTER TABLE public.session_formateurs
ADD COLUMN IF NOT EXISTS presence text NOT NULL DEFAULT 'present'
CHECK (presence IN ('present', 'absent', 'excuse'));
