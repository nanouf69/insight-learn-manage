
GRANT SELECT ON public.factures TO authenticated;
GRANT SELECT ON public.facture_paiements TO authenticated;

DROP POLICY IF EXISTS "Learner can select own factures" ON public.factures;
CREATE POLICY "Learner can select own factures"
ON public.factures FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.apprenants a
    WHERE a.id = factures.apprenant_id
      AND a.auth_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Learner can select own facture_paiements" ON public.facture_paiements;
CREATE POLICY "Learner can select own facture_paiements"
ON public.facture_paiements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.factures f
    JOIN public.apprenants a ON a.id = f.apprenant_id
    WHERE f.id = facture_paiements.facture_id
      AND a.auth_user_id = auth.uid()
  )
);
