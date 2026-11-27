/**
 * Décision pure du bouton « Terminé » d'un module.
 * Autorité = verdict serveur relu au clic (`etat_completion_modules`) :
 * - lecture impossible : blocage avec nouvel essai, jamais de faux « terminé » ;
 * - ligne serveur « completed » ET preuve actuelle non incomplète : sortie sans écriture ;
 * - ligne « completed » mais preuve incomplète (ligne historique périmée) : blocage nommant le quiz manquant ;
 * - module non validé : blocage si un quiz manque, sinon enregistrement serveur.
 */
export interface QuizManquant { id: string; label: string; missingQuestionIds?: string[] }
export interface EtatServeurModule { status: string | null; preuve_complete: boolean | null }
export type DecisionFinModule =
  | { action: "sortie" }
  | { action: "bloquer"; message: string; manquants: QuizManquant[] }
  | { action: "erreur"; message: string }
  | { action: "enregistrer" };

export const MESSAGE_VERIFICATION_IMPOSSIBLE =
  "Vérification du module impossible pour le moment : rien n'a été validé. Vérifiez votre connexion puis réessayez.";

export function libelleQuizManquants(manquants: QuizManquant[]): string {
  return manquants.map((q) => {
    const n = q.missingQuestionIds?.length ?? 0;
    const titre = q.label && q.label !== q.id ? `« ${q.label} »` : `quiz n° ${q.id}`;
    return n > 0 ? `${titre} (${n} question${n > 1 ? "s" : ""} sans réponse)` : titre;
  }).join(", ");
}

export function decisionFinModule(p: {
  /** undefined = lecture serveur en erreur ; null = aucune ligne serveur (première validation). */
  etatServeur: EtatServeurModule | null | undefined;
  quizRestants: QuizManquant[] | null | undefined;
  exosSoumis: ReadonlySet<number>;
}): DecisionFinModule {
  if (p.etatServeur === undefined) return { action: "erreur", message: MESSAGE_VERIFICATION_IMPOSSIBLE };
  const manquants = (p.quizRestants ?? []).filter((q) => !p.exosSoumis.has(Number(q.id)));
  const valideServeur = p.etatServeur?.status === "completed";
  if (valideServeur && p.etatServeur!.preuve_complete !== false) return { action: "sortie" };
  if (manquants.length) {
    return { action: "bloquer", manquants,
      message: `Module à terminer : quiz sans réponse enregistrée : ${libelleQuizManquants(manquants)}.` };
  }
  if (valideServeur) {
    // Preuve serveur incomplète sans quiz identifiable : jamais de succès local.
    return { action: "erreur", message: "Module à terminer : la validation n'est pas encore confirmée par le serveur. Réessayez dans un instant." };
  }
  return { action: "enregistrer" };
}
