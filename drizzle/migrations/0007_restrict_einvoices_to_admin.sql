DROP POLICY IF EXISTS "Authenticated can read e-invoices" ON public.factures_electroniques;
DROP POLICY IF EXISTS "Authenticated can manage e-invoices" ON public.factures_electroniques;
CREATE POLICY "Admins manage e-invoices"
ON public.factures_electroniques
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can read e-invoice events" ON public.facture_electronique_evenements;
DROP POLICY IF EXISTS "Authenticated can insert e-invoice events" ON public.facture_electronique_evenements;
CREATE POLICY "Admins read e-invoice events"
ON public.facture_electronique_evenements
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert e-invoice events"
ON public.facture_electronique_evenements
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));