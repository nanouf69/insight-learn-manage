/** Cycle de vie de l'attestation : transitions autorisées par rôle, jamais d'auto-signature. */
export type StatutAttestation = "brouillon" | "a_verifier" | "a_signer" | "signee" | "revoquee";
export type Acteur = { role: "admin" | "apprenant"; userId: string };
export interface Attestation {
  id: string; apprenantId: string; apprenantUserId: string; version: number;
  statut: StatutAttestation; empreinte: string;
  signatureCentre: { parUserId: string; at: string; consentementId: string } | null;
  signatureApprenant: { parUserId: string; at: string; empreinteSignee: string } | null;
}
export type Action =
  | { type: "soumettre_verification" }
  | { type: "valider_pour_signature"; eligible: boolean; signatureCentreAutorisee: { consentementId: string } | null }
  | { type: "signer_apprenant"; empreinteVue: string; at: string }
  | { type: "revoquer"; motif: string };
export type Resultat = { ok: true; attestation: Attestation } | { ok: false; raison: string };

export function appliquer(a: Attestation, acteur: Acteur, action: Action, at: string): Resultat {
  const refus = (raison: string): Resultat => ({ ok: false, raison });
  if (a.statut === "revoquee") return refus("Attestation révoquée : aucune action possible");
  switch (action.type) {
    case "soumettre_verification":
      if (acteur.role !== "admin") return refus("Réservé à l'administration");
      if (a.statut !== "brouillon") return refus("Statut incompatible");
      return { ok: true, attestation: { ...a, statut: "a_verifier" } };
    case "valider_pour_signature":
      if (acteur.role !== "admin") return refus("Réservé à l'administration");
      if (a.statut !== "a_verifier") return refus("Statut incompatible");
      if (!action.eligible) return refus("Formation non terminée et validée : attestation bloquée");
      if (!action.signatureCentreAutorisee?.consentementId) return refus("Signature du centre non autorisée : aucune signature fabriquée");
      if (acteur.userId === a.apprenantUserId) return refus("Auto-validation interdite");
      return { ok: true, attestation: { ...a, statut: "a_signer", signatureCentre: { parUserId: acteur.userId, at, consentementId: action.signatureCentreAutorisee.consentementId } } };
    case "signer_apprenant":
      if (acteur.role !== "apprenant" || acteur.userId !== a.apprenantUserId) return refus("Seul l'apprenant concerné peut signer");
      if (a.statut !== "a_signer") return refus("Statut incompatible");
      if (action.empreinteVue !== a.empreinte) return refus("Document modifié depuis l'affichage : relire avant de signer");
      return { ok: true, attestation: { ...a, statut: "signee", signatureApprenant: { parUserId: acteur.userId, at: action.at, empreinteSignee: a.empreinte } } };
    case "revoquer":
      if (acteur.role !== "admin") return refus("Réservé à l'administration");
      if (!action.motif.trim()) return refus("Motif obligatoire");
      return { ok: true, attestation: { ...a, statut: "revoquee" } };
  }
}

/** Une seule attestation active (non révoquée) par dossier : un doublon est refusé, jamais fusionné. */
export function doublonActif(existantes: Pick<Attestation, "apprenantId" | "statut">[], apprenantId: string): boolean {
  return existantes.some(x => x.apprenantId === apprenantId && x.statut !== "revoquee");
}
