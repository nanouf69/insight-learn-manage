
-- 1. Revoke EXECUTE on trigger-only SECURITY DEFINER function from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.ensure_quiz_result_on_matiere_completion() FROM PUBLIC, anon, authenticated;

-- 2. Public tables: drop USING(true) SELECT policies and add scoped replacements

-- creneaux_rdv: admin already covered by ALL; add owning-apprenant SELECT
DROP POLICY IF EXISTS "creneaux_rdv public read" ON public.creneaux_rdv;
CREATE POLICY "Apprenants can view their own creneau"
  ON public.creneaux_rdv FOR SELECT TO authenticated
  USING (
    apprenant_id IN (SELECT id FROM public.apprenants WHERE auth_user_id = auth.uid())
  );

-- devis_envois: admin-only; public devis page will use edge function
DROP POLICY IF EXISTS "Public can select devis by token" ON public.devis_envois;

-- formateur_emargements: admin only
DROP POLICY IF EXISTS "Public can read formateur emargements" ON public.formateur_emargements;

-- fournisseur_apprenants: admin only
DROP POLICY IF EXISTS "Public can select fournisseur_apprenants" ON public.fournisseur_apprenants;

-- fournisseur_documents: admin only
DROP POLICY IF EXISTS "Public can select fournisseur_documents" ON public.fournisseur_documents;

-- fournisseur_factures: admin only
DROP POLICY IF EXISTS "Public can select fournisseur_factures" ON public.fournisseur_factures;

-- fournisseur_paiements: admin only
DROP POLICY IF EXISTS "Public can select fournisseur_paiements" ON public.fournisseur_paiements;

-- fournisseur_shared_docs: admin only
DROP POLICY IF EXISTS "Public can select fournisseur_shared_docs" ON public.fournisseur_shared_docs;

-- fournisseurs: admin only (portal token verification moves to edge functions)
DROP POLICY IF EXISTS "Public can select fournisseur by token" ON public.fournisseurs;

-- justificatifs: admin only
DROP POLICY IF EXISTS "Public can select justificatifs" ON public.justificatifs;

-- notes_frais: admin only
DROP POLICY IF EXISTS "Public can select notes_frais" ON public.notes_frais;

-- reservations_pratique: admin already covered; add owning-apprenant SELECT
DROP POLICY IF EXISTS "Allow public select reservations_pratique" ON public.reservations_pratique;
CREATE POLICY "Apprenants can view their own reservation"
  ON public.reservations_pratique FOR SELECT TO authenticated
  USING (
    apprenant_id IN (SELECT id FROM public.apprenants WHERE auth_user_id = auth.uid())
  );

-- 3. Storage bucket policies
-- Drop insecure public upload policies (uploads now go via edge functions)
DROP POLICY IF EXISTS "Public can upload fournisseur docs" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload to fournisseur-shared-docs" ON storage.objects;

-- justificatifs bucket: drop "Allow all", admin-only
DROP POLICY IF EXISTS "Allow all on justificatifs bucket" ON storage.objects;
CREATE POLICY "Admins manage justificatifs files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'justificatifs' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'justificatifs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- notes-frais bucket: drop public read
DROP POLICY IF EXISTS "Public can read notes-frais files" ON storage.objects;

-- releves-bancaires bucket: drop "Allow all", admin-only
DROP POLICY IF EXISTS "Allow all operations on releves-bancaires" ON storage.objects;
CREATE POLICY "Admins manage releves-bancaires files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'releves-bancaires' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'releves-bancaires' AND public.has_role(auth.uid(), 'admin'::public.app_role));
