-- CANDIDAT NON INSTALLÉ — circuit serveur de l'attestation de fin de formation validée.
-- Append-only : aucune suppression, aucune mise à jour d'une signature ; chaque changement = nouvel événement.
CREATE TABLE public.attestations_fin_validee (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apprenant_id uuid NOT NULL,
  apprenant_user_id uuid NOT NULL,
  version_modele text NOT NULL,
  contenu jsonb NOT NULL,            -- lignes exactes affichées
  date_fin_connexion_id uuid NOT NULL,      -- connexion source de la date de fin (apprenant_connexions)
  date_fin_connexion_at timestamptz NOT NULL, -- started_at exact, piste d audit
  derniere_validation_at timestamptz NOT NULL, -- recontrôle serveur : connexion >= validation finale
  empreinte text NOT NULL,           -- SHA-256 du contenu + version
  reference text NOT NULL UNIQUE,
  cree_par uuid NOT NULL,
  cree_le timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.attestations_fin_validee_evenements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attestation_id uuid NOT NULL REFERENCES public.attestations_fin_validee(id),
  type text NOT NULL CHECK (type IN ('a_verifier','a_signer','signature_centre','signature_apprenant','revoquee')),
  acteur_user_id uuid NOT NULL,
  empreinte_vue text NOT NULL,
  consentement_id uuid,              -- signature centre : consentement stocké obligatoire
  signature_data_url text,           -- signature apprenant : image non vide
  motif text,
  at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.attestations_fin_validee, public.attestations_fin_validee_evenements TO authenticated;
GRANT ALL ON public.attestations_fin_validee, public.attestations_fin_validee_evenements TO service_role;
ALTER TABLE public.attestations_fin_validee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attestations_fin_validee_evenements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin lit" ON public.attestations_fin_validee FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR apprenant_user_id = auth.uid());
CREATE POLICY "admin lit evt" ON public.attestations_fin_validee_evenements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attestations_fin_validee a WHERE a.id = attestation_id AND (public.has_role(auth.uid(),'admin') OR a.apprenant_user_id = auth.uid())));
-- Écritures UNIQUEMENT via RPC SECURITY DEFINER (à écrire et tester sur base jetable) :
--  * creer : admin, recontrôle serveur etat_completion_modules (tous preuve_complete) + heures + signatures ; refus si une attestation non révoquée existe (index unique partiel).
--  * signer_apprenant : auth.uid() = apprenant_user_id, empreinte_vue = empreinte, statut a_signer, image non vide (contrôle qualité).
--  * signature_centre : admin ≠ apprenant, consentement présent dans documents admin privés.
--  * revoquer : admin, motif obligatoire.
CREATE UNIQUE INDEX attestation_fin_validee_une_active ON public.attestations_fin_validee (apprenant_id)
  WHERE NOT EXISTS_PLACEHOLDER; -- remplacer par colonne statut dénormalisée ou trigger : à valider.
