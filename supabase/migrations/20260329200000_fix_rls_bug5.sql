-- BUG #5 FIX: Corriger les policies RLS trop permissives

-- 1. agenda_blocs: remplacer la policy publique SELECT USING(true) par une policy authentifiée
DROP POLICY IF EXISTS "Allow public read agenda_blocs" ON public.agenda_blocs;
CREATE POLICY "Authenticated can read agenda_blocs"
  ON public.agenda_blocs FOR SELECT TO authenticated USING (true);

-- 2. apprenants: ajouter une condition WITH CHECK à la policy INSERT onboarding
-- Seuls les apprenants NON encore associés à un auth_user peuvent être insérés via public
DROP POLICY IF EXISTS "Onboarding insert apprenants" ON public.apprenants;
CREATE POLICY "Onboarding insert apprenants"
  ON public.apprenants FOR INSERT TO public
  WITH CHECK (auth_user_id IS NULL AND deleted_at IS NULL);
