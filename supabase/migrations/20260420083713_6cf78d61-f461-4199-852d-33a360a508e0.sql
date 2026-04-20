-- Allow public access (used by accounting collaborator portal e.g. Marjorie LEDRU)
-- to read, insert and update justificatifs. Deletion remains admin-only.
CREATE POLICY "Public can select justificatifs"
ON public.justificatifs
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can insert justificatifs"
ON public.justificatifs
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can update justificatifs"
ON public.justificatifs
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);