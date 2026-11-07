-- Retour arrière ciblé, à utiliser seulement en cas d'incident.
-- Rétablit exactement les politiques et le GRANT anon observés avant 0245.
-- Les lectures authentifiées redeviennent alors générales : ne pas utiliser comme correctif.
SET lock_timeout = '1500ms';
SET statement_timeout = '20000ms';

DROP POLICY IF EXISTS future_opening_read ON public.bilan_future_opening;
CREATE POLICY future_opening_read ON public.bilan_future_opening
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lecture flags identites" ON public.bilan_identite_flags;
CREATE POLICY "Lecture flags identites" ON public.bilan_identite_flags
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lecture flags snapshot bilan" ON public.bilan_snapshot_flags;
CREATE POLICY "Lecture flags snapshot bilan" ON public.bilan_snapshot_flags
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lecture règles modules" ON public.module_regles_validation;
CREATE POLICY "Lecture règles modules" ON public.module_regles_validation
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.bilan_future_opening TO anon;
GRANT SELECT ON public.bilan_identite_flags TO anon;
GRANT SELECT ON public.bilan_snapshot_flags TO anon;
GRANT SELECT ON public.module_regles_validation TO anon;
