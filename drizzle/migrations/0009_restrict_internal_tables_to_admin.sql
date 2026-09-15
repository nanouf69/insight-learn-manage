DROP POLICY IF EXISTS "Equipe peut voir les taches" ON public.taches;
DROP POLICY IF EXISTS "Equipe peut creer des taches" ON public.taches;
DROP POLICY IF EXISTS "Equipe peut modifier les taches" ON public.taches;
DROP POLICY IF EXISTS "Equipe peut supprimer les taches" ON public.taches;
CREATE POLICY "Admins manage taches"
ON public.taches FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated staff can manage renouvellements" ON public.renouvellements;
CREATE POLICY "Admins manage renouvellements"
ON public.renouvellements FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can read teams link sends" ON public.envois_lien_teams;
DROP POLICY IF EXISTS "Authenticated can insert teams link sends" ON public.envois_lien_teams;
CREATE POLICY "Admins read teams link sends"
ON public.envois_lien_teams FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert teams link sends"
ON public.envois_lien_teams FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));