/**
 * Diagnostic d'une tentative (fonction pure, testée).
 * Le diagnostic ne dépend QUE du nombre de réponses serveur de la tentative,
 * jamais du volume total de réponses de la période.
 */
export type EntreeDiagnostic = {
  etat: string | null;
  questionsAttendues: number;
  reponsesServeur: number;
  nbResultats: number;
  neutralisee: boolean;
  ouverteDepuisMs: number;
};

export function diagnostiquer(e: EntreeDiagnostic): string[] {
  if (e.neutralisee) return ["NEUTRALISEE"];
  const codes: string[] = [];
  const termine = e.etat === "terminee";
  if (termine && e.questionsAttendues === 0) codes.push("TENTATIVE_VIDE");
  else if (termine && e.reponsesServeur === 0) codes.push("RESULTAT_SANS_REPONSE_SERVEUR");
  else if (termine && e.reponsesServeur !== e.questionsAttendues) codes.push("MAUVAIS_NOMBRE_DE_QUESTIONS");
  if (e.nbResultats > 1) codes.push("RESULTATS_MULTIPLES");
  if (termine && e.nbResultats === 0) codes.push("FINALISATION_EN_ATTENTE");
  if (!termine && e.reponsesServeur === 0 && e.ouverteDepuisMs > 2 * 3600_000) codes.push("SAUVEGARDE_BLOQUEE");
  return codes;
}
