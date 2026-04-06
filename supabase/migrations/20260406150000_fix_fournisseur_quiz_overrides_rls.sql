-- Fix: Les fournisseurs ne peuvent plus lire ni écrire dans quiz_questions_overrides
-- La migration 20260327113912 a supprimé les policies "public" et n'a gardé que:
--   - "Authenticated can read quiz_overrides" (SELECT, authenticated seulement)
--   - "Admins can manage quiz_overrides" (ALL, admin seulement)
--
-- Le portail fournisseur utilise la clé anon (rôle public) → tout est bloqué.
-- Les apprenants (authenticated) ne pouvaient plus écrire non plus.
--
-- Correction: ajouter des policies pour le rôle "public" avec vérification
-- que le fournisseur_id référence un fournisseur actif.

-- 1. Lecture publique (fournisseurs + apprenants non-authentifiés ont besoin de lire)
CREATE POLICY "Public can read quiz_overrides"
  ON public.quiz_questions_overrides
  FOR SELECT
  TO public
  USING (true);

-- 2. Insertion: vérifier que le fournisseur_id correspond à un fournisseur actif
CREATE POLICY "Fournisseurs can insert quiz_overrides"
  ON public.quiz_questions_overrides
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fournisseurs f
      WHERE f.id = fournisseur_id AND f.actif = true
    )
  );

-- 3. Mise à jour: même vérification
CREATE POLICY "Fournisseurs can update quiz_overrides"
  ON public.quiz_questions_overrides
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.fournisseurs f
      WHERE f.id = fournisseur_id AND f.actif = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fournisseurs f
      WHERE f.id = fournisseur_id AND f.actif = true
    )
  );

-- 4. Suppression (restauration d'une question): même vérification
CREATE POLICY "Fournisseurs can delete quiz_overrides"
  ON public.quiz_questions_overrides
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.fournisseurs f
      WHERE f.id = fournisseur_id AND f.actif = true
    )
  );
