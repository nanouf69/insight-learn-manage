export type DossierBienvenueDepotEtat =
  | { statut: "depose"; dateDepot: Date }
  | { statut: "non_depose" }
  | { statut: "date_indisponible" };

type DocumentBienvenueLike = {
  type_document?: string | null;
  donnees?: Record<string, unknown> | null;
};

const SIGNATURE_KEYS = [
  "signature",
  "_signature_image",
  "signature_apprenant",
  "signatureDataUrl",
  "signature_data_url",
  "onboarding_signature",
] as const;

const estSignatureValide = (donnees: Record<string, unknown>): boolean =>
  SIGNATURE_KEYS.some((key) => {
    const value = donnees[key];
    return typeof value === "string" && value.trim().startsWith("data:image/");
  });

/**
 * La seule date fiable est celle écrite dans le document lors de sa finalisation signée.
 * Les dates techniques de ligne (created_at, completed_at, updated_at) sont volontairement ignorées.
 */
export function etatDepotDossierBienvenue(
  documents: DocumentBienvenueLike[],
): DossierBienvenueDepotEtat {
  const dossier = documents.find((document) => document.type_document === "dossier-bienvenue");
  if (!dossier) return { statut: "non_depose" };

  const donnees = dossier.donnees;
  if (!donnees || !estSignatureValide(donnees)) return { statut: "date_indisponible" };

  const valeur = donnees.date_completion;
  if (typeof valeur !== "string" || !valeur.trim()) return { statut: "date_indisponible" };

  const dateDepot = new Date(valeur);
  if (Number.isNaN(dateDepot.getTime())) return { statut: "date_indisponible" };

  return { statut: "depose", dateDepot };
}

export function libelleDepotDossierBienvenue(etat: DossierBienvenueDepotEtat): string {
  if (etat.statut === "non_depose") return "Non déposé";
  if (etat.statut === "date_indisponible") return "Date de dépôt non disponible";

  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(etat.dateDepot);

  return `✅ Déposé le ${date.replace(",", " à")}`;
}