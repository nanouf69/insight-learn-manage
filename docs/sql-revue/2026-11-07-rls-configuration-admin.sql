-- Restreint uniquement la lecture directe de quatre tables de configuration interne.
-- Aucune donnée, fonction, règle pédagogique ou permission EXECUTE n'est modifiée.
SET lock_timeout = '1500ms';
SET statement_timeout = '20000ms';

DROP POLICY IF EXISTS future_opening_read ON public.bilan_future_opening;
CREATE POLICY future_opening_read ON public.bilan_future_opening
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Lecture flags identites" ON public.bilan_identite_flags;
CREATE POLICY "Lecture flags identites" ON public.bilan_identite_flags
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Lecture flags snapshot bilan" ON public.bilan_snapshot_flags;
CREATE POLICY "Lecture flags snapshot bilan" ON public.bilan_snapshot_flags
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Lecture règles modules" ON public.module_regles_validation;
CREATE POLICY "Lecture règles modules" ON public.module_regles_validation
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Les rôles anonymes n'ont aucun chemin légitime de lecture directe.
REVOKE SELECT ON public.bilan_future_opening FROM anon;
REVOKE SELECT ON public.bilan_identite_flags FROM anon;
REVOKE SELECT ON public.bilan_snapshot_flags FROM anon;
REVOKE SELECT ON public.module_regles_validation FROM anon;
