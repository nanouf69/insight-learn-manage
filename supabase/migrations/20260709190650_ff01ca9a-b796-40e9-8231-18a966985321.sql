
-- 1. agenda_blocs : plus de lecture publique
DROP POLICY IF EXISTS "Allow public select agenda_blocs" ON public.agenda_blocs;

-- 2. apprenants : suppression écritures publiques non scopées
DROP POLICY IF EXISTS "Onboarding update apprenants" ON public.apprenants;
DROP POLICY IF EXISTS "Onboarding insert apprenants" ON public.apprenants;

-- 3. module_editor_state : lecture authentifiée seulement
DROP POLICY IF EXISTS "Public can read module_editor_state" ON public.module_editor_state;
CREATE POLICY "Authenticated can read module_editor_state"
  ON public.module_editor_state FOR SELECT
  TO authenticated USING (true);

-- 4. sessions : suppression accès public
DROP POLICY IF EXISTS "Allow public insert sessions for onboarding" ON public.sessions;
DROP POLICY IF EXISTS "Allow public select sessions for onboarding" ON public.sessions;
DROP POLICY IF EXISTS "Allow public insert session_apprenants for onboarding" ON public.session_apprenants;

-- 5. rdv_carte_vtc_slots : admin only (l'accès public passe par edge function service_role)
DROP POLICY IF EXISTS "auth_delete_rdv" ON public.rdv_carte_vtc_slots;
DROP POLICY IF EXISTS "auth_insert_rdv" ON public.rdv_carte_vtc_slots;
DROP POLICY IF EXISTS "auth_update_rdv" ON public.rdv_carte_vtc_slots;
DROP POLICY IF EXISTS "auth_select_rdv" ON public.rdv_carte_vtc_slots;
CREATE POLICY "Admins can manage rdv_carte_vtc_slots"
  ON public.rdv_carte_vtc_slots FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6. Suppression des policies USING(true)/WITH CHECK(true) sur INSERT/UPDATE/DELETE
--    (les edge functions correspondantes utilisent la service_role qui bypass RLS)
DROP POLICY IF EXISTS "Service role can insert alertes" ON public.alertes_systeme;
DROP POLICY IF EXISTS "creneaux_rdv public insert" ON public.creneaux_rdv;
DROP POLICY IF EXISTS "Public can insert formateur emargements" ON public.formateur_emargements;
DROP POLICY IF EXISTS "Public can update fournisseur_apprenants" ON public.fournisseur_apprenants;
DROP POLICY IF EXISTS "Public can insert fournisseur_apprenants" ON public.fournisseur_apprenants;
DROP POLICY IF EXISTS "Public can insert fournisseur_documents" ON public.fournisseur_documents;
DROP POLICY IF EXISTS "Public can delete fournisseur_factures" ON public.fournisseur_factures;
DROP POLICY IF EXISTS "Public can insert fournisseur_factures" ON public.fournisseur_factures;
DROP POLICY IF EXISTS "Public can insert fournisseur_shared_docs" ON public.fournisseur_shared_docs;
DROP POLICY IF EXISTS "Public can update justificatifs" ON public.justificatifs;
DROP POLICY IF EXISTS "Public can insert justificatifs" ON public.justificatifs;
DROP POLICY IF EXISTS "Allow public update reservations_pratique" ON public.reservations_pratique;
DROP POLICY IF EXISTS "Allow public insert reservations_pratique" ON public.reservations_pratique;

-- 7. search_path sur les fonctions non-DEFINER restantes
ALTER FUNCTION public.set_updated_at_rdv_slots() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 8. Retrait EXECUTE sur fonctions SECURITY DEFINER internes (triggers/cron/protections)
REVOKE EXECUTE ON FUNCTION public.audit_rdv_carte_vtc_slots() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_apprenant_session_limits() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_reservations_pratique_capacity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_duplicate_quiz_result_insert_for_learners() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_apprenant_paiements() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_next_quiz_tentative() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_cma_from_dossier_bienvenue() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_creneau_rdv() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at_timestamp() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_reserved_rdv_slot() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_nonzero_quiz_score_on_update() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_max_apprenants_per_session() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at_rdv_slots() FROM anon, authenticated, PUBLIC;

-- Fonctions RPC accessibles aux utilisateurs authentifiés (mais pas anon)
REVOKE EXECUTE ON FUNCTION public.start_apprenant_connexion(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_apprenant_connexion(uuid, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_apprenant_connexion(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_apprenant_session(uuid, uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_active_apprenant_connexion_info(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_current_user_apprenant(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_apprenant_onboarding(text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;

-- 9. Buckets publics : supprimer les policies de listing (les URLs publiques continuent de fonctionner)
DROP POLICY IF EXISTS "Fichiers de cours accessibles publiquement" ON storage.objects;
DROP POLICY IF EXISTS "Public can read devis files" ON storage.objects;
DROP POLICY IF EXISTS "Public can read fournisseur docs" ON storage.objects;
DROP POLICY IF EXISTS "Public can view fournisseur-shared-docs" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read documents-inscription" ON storage.objects;
