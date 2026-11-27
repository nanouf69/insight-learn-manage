/**
 * Décision pure du bouton « Terminé » d'un module.
 * - Module déjà validé côté serveur (ligne completed relue au chargement) : sortie
 *   idempotente, aucune écriture, aucun rejeu des contrôles de première validation.
 * - Sinon : blocage strict si un quiz requis manque, en nommant le quiz réel.
 */
export interface QuizManquant { id: string; label: string; missingQuestionIds?: string[] }
export type DecisionFinModule =
  | { action: "sortie" }
  | { action: "bloquer"; message: string; manquants: QuizManquant[] }
  | { action: "enregistrer" };

export function libelleQuizManquants(manquants: QuizManquant[]): string {
  return manquants.map((q) => {
    const n = q.missingQuestionIds?.length ?? 0;
    const titre = q.label && q.label !== q.id ? `« ${q.label} »` : `quiz n° ${q.id}`;
    return n > 0 ? `${titre} (${n} question${n > 1 ? "s" : ""} sans réponse)` : titre;
  }).join(", ");
}

export function decisionFinModule(p: {
  completionServeurConfirmee: boolean;
  quizRestants: QuizManquant[] | null | undefined;
  exosSoumis: Set<number>;
}): DecisionFinModule {
  if (p.completionServeurConfirmee) return { action: "sortie" };
  const manquants = (p.quizRestants ?? []).filter((q) => !p.exosSoumis.has(Number(q.id)));
  if (manquants.length) {
    return { action: "bloquer", manquants,
      message: `Module à terminer : quiz sans réponse enregistrée : ${libelleQuizManquants(manquants)}.` };
  }
  return { action: "enregistrer" };
}
