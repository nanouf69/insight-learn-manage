export const CRITERES_I21 = [
  { id: "maitrise_anglais", label: "Maîtrise de l’anglais" },
  { id: "competences_pedagogiques", label: "Compétences pédagogiques" },
  { id: "connaissance_programme", label: "Connaissance du programme TAXI/VTC" },
  { id: "capacite_expliquer", label: "Capacité à expliquer" },
  { id: "adaptation_niveau", label: "Adaptation au niveau des élèves" },
  { id: "respect_programme", label: "Respect du programme" },
  { id: "ponctualite_professionnalisme", label: "Ponctualité et professionnalisme" },
] as const;

export const APPRECIATIONS_I21 = ["acquis", "a_renforcer", "non_acquis", "non_evalue"] as const;
export const EVALUATION_I21_VERSION = "services-pro-evaluation-i21-2026-11-25-v1";
export const CONSENTEMENT_EVALUATION_I21 = "Je déclare avoir réellement examiné le bilan et les pièces affichés et évalué les sept critères. Je signe personnellement ce compte rendu ; sa date et son heure sont enregistrées par le serveur.";

export function criteresI21Valides(valeur: unknown): valeur is Record<string, string> {
  if (!valeur || typeof valeur !== "object" || Array.isArray(valeur)) return false;
  const source = valeur as Record<string, unknown>;
  return CRITERES_I21.every(critere => APPRECIATIONS_I21.includes(source[critere.id] as typeof APPRECIATIONS_I21[number]))
    && Object.keys(source).length === CRITERES_I21.length;
}

export function libelleAppreciationI21(valeur: string): string {
  return ({ acquis: "Acquis", a_renforcer: "À renforcer", non_acquis: "Non acquis", non_evalue: "Non évalué" } as Record<string, string>)[valeur] ?? "Non évalué";
}
