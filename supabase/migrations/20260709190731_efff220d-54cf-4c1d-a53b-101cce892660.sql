
DROP POLICY IF EXISTS "Admins can manage releves" ON public.releves_bancaires;
CREATE POLICY "Admins can manage releves_bancaires"
  ON public.releves_bancaires FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
