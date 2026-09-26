-- Transition temporaire : la version en ligne lit encore la table directement.
-- À retirer juste après publication de l'appel à core_sujet_publie.
CREATE POLICY "Transition lecture versions publiees" ON public.exam_content_versions
  FOR SELECT TO authenticated USING (statut = 'publiee' AND retired_at IS NULL);