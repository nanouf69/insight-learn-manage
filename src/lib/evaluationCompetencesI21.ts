export const CRITERES_I21 = [
  { id: "maitrise_anglais", label: "Maîtrise de l’anglais" },
  { id: "competences_pedagogiques", label: "Compétences pédagogiques" },
  { id: "connaissance_programme", label: "Connaissance du programme TAXI/VTC" },
  { id: "capacite_expliquer", label: "Capacité à expliquer" },
  { id: "adaptation_niveau", label: "Adaptation au niveau des élèves" },
  { id: "respect_programme", label: "Respect du programme" },
  { id: "ponctualite_professionnalisme", label: "Ponctualité et professionnalisme" },
] as const;

export const APPRECIATIONS_I21 = {
  acquis: "Acquis",
  a_renforcer: "À renforcer",
  non_acquis: "Non acquis",
  non_evalue: "Non évalué",
} as const;

export type AppreciationI21 = keyof typeof APPRECIATIONS_I21;
export type CriteresI21 = Record<(typeof CRITERES_I21)[number]["id"], AppreciationI21>;

export function brouillonCriteresI21(): CriteresI21 {
  return Object.fromEntries(CRITERES_I21.map(critere => [critere.id, "acquis"])) as CriteresI21;
}

export function libelleAppreciationI21(valeur: string): string {
  return APPRECIATIONS_I21[valeur as AppreciationI21] ?? "Non évalué";
}
