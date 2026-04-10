CREATE POLICY "Allow public update reservations_pratique"
ON public.reservations_pratique
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);