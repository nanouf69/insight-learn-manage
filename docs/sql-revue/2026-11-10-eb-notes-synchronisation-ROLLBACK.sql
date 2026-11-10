-- Rollback synchronisation des notes EB : retire les trois commandes. Le journal est conservé (preuves).
DROP FUNCTION IF EXISTS public.eb_notes_actualiser(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.eb_notes_diagnostic_ancien(uuid, integer);
DROP FUNCTION IF EXISTS public.eb_notes_diagnostic(uuid, integer, uuid);
COMMENT ON TABLE public.eb_notes_synchronisations IS 'DEPRECATED si rollback appliqué : journal conservé, plus alimenté.';
