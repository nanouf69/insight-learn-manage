-- Permettre aux fournisseurs (accès public via token) de supprimer leurs propres factures
CREATE POLICY "Public can delete fournisseur_factures"
ON public.fournisseur_factures
FOR DELETE
TO public
USING (true);