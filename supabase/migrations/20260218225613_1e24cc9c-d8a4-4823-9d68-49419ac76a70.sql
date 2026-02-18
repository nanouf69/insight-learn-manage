-- Autoriser la lecture publique de agenda_blocs pour le portail formateur
CREATE POLICY "Allow public select agenda_blocs"
  ON public.agenda_blocs
  FOR SELECT
  USING (true);