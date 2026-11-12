/** Préparation isolée : non branchée tant que refus des sessions ouvertes non prouvé. */
export interface DocumentFermeture {
  id: string; apprenant_id: string | null; modele_code: string | null;
  envoi_etat: string | null; envoye_le: string | null;
}
export interface FermetureDeps {
  lireDocument(id: string): Promise<DocumentFermeture | null>;
  lireCompte(apprenantId: string): Promise<{ userId: string | null; estAdmin: boolean; nombreDossiers: number }>;
  refuserAccesServeur(apprenantId: string, documentId: string): Promise<boolean>;
  desactiverConnexion(userId: string): Promise<boolean>;
  journaliser(apprenantId: string, documentId: string, issue: string): Promise<void>;
}

/** Rejeu sans mail : le transport d'envoi n'est volontairement pas une dépendance. */
export async function fermerCompteApresAttestation(deps: FermetureDeps, documentId: string) {
  const d = await deps.lireDocument(documentId);
  if (!d || d.modele_code !== "attestation_fin_formation" || !d.apprenant_id
    || d.envoi_etat !== "envoye" || !d.envoye_le)
    return { etat: "refuse", raison: "Envoi confirmé de l'attestation requis" } as const;
  const c = await deps.lireCompte(d.apprenant_id);
  if (c.estAdmin || c.nombreDossiers !== 1)
    return { etat: "refuse", raison: "Compte partagé ou administrateur : contrôle individuel requis" } as const;
  // Ce contrôle doit couvrir les JWT déjà délivrés, pas seulement le prochain login.
  if (!(await deps.refuserAccesServeur(d.apprenant_id, d.id))) {
    await deps.journaliser(d.apprenant_id, d.id, "refus_serveur_non_confirme");
    return { etat: "a_verifier", raison: "Fermeture des accès serveur non confirmée" } as const;
  }
  if (c.userId && !(await deps.desactiverConnexion(c.userId))) {
    await deps.journaliser(d.apprenant_id, d.id, "connexion_non_desactivee");
    return { etat: "a_verifier", raison: "Désactivation de connexion non confirmée" } as const;
  }
  await deps.journaliser(d.apprenant_id, d.id, "compte_ferme");
  return { etat: "ferme" } as const;
}