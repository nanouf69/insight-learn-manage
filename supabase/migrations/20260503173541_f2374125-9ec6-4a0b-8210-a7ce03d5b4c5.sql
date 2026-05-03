ALTER TABLE public.agenda_blocs
ADD COLUMN IF NOT EXISTS publics_cibles text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.agenda_blocs.publics_cibles IS 'Publics destinataires du cours : TAXI, TA, VTC, VA. Si vide, on retombe sur le matching legacy via le champ formation.';