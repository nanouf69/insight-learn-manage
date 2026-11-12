import type { StatutAttestation } from "./cycle";
export type FiltreAttestation = "a_envoyer" | "en_attente" | "signee" | "toutes";
export const LIBELLES_FILTRE: Record<FiltreAttestation, string> = { a_envoyer: "À envoyer", en_attente: "En attente de signature", signee: "Signée", toutes: "Toutes" };
/** « À envoyer » = préparée (brouillon / à vérifier) mais jamais envoyée ; une révoquée n'apparaît que dans « Toutes ». */
export function correspondFiltre(statut: StatutAttestation | "envoi_incertain", f: FiltreAttestation): boolean {
  if (f === "toutes") return true;
  if (f === "a_envoyer") return statut === "brouillon" || statut === "a_verifier";
  if (f === "en_attente") return statut === "a_signer" || statut === "envoi_incertain";
  return statut === "signee";
}
