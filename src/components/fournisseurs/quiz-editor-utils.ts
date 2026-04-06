/**
 * Utility functions for the fournisseur quiz editor (EditableQuizViewer).
 * Extracted for testability and reuse.
 */

export interface QuizChoice {
  lettre: string;
  texte: string;
  correct?: boolean;
}

/**
 * Toggle correct answer — radio-button style.
 * Clicking a choice makes it THE correct answer; all others become incorrect.
 * Clicking the already-correct choice keeps it correct (prevents zero-correct state).
 */
export function toggleCorrect(choix: QuizChoice[], index: number): QuizChoice[] {
  return choix.map((c, i) => ({ ...c, correct: i === index }));
}

/**
 * Validate question data before saving.
 * Returns error message or null if valid.
 */
export function validateQuestionEdit(enonce: string, choix: QuizChoice[]): string | null {
  if (!enonce.trim()) return "L'énoncé ne peut pas être vide";
  if (choix.length < 2) return "Il faut au moins 2 choix";
  const hasCorrect = choix.some(c => c.correct);
  if (!hasCorrect) return "Il faut au moins une bonne réponse";
  const hasEmptyChoix = choix.some(c => !c.texte.trim());
  if (hasEmptyChoix) return "Tous les choix doivent avoir un texte";
  return null;
}

/**
 * Résout le conflit entre une modification admin et un override fournisseur.
 * Règle: la dernière modification gagne, basée sur les timestamps.
 *
 * @param adminEditedAt - timestamp ISO de la dernière modif admin sur cette question (ou undefined)
 * @param fournisseurUpdatedAt - timestamp ISO de l'override fournisseur
 * @returns "admin" si l'admin a modifié plus récemment, "fournisseur" sinon
 */
export function resolveOverrideConflict(
  adminEditedAt: string | undefined,
  fournisseurUpdatedAt: string,
): "admin" | "fournisseur" {
  // Pas de timestamp admin → pas de modif admin → fournisseur gagne
  if (!adminEditedAt) return "fournisseur";
  // Comparer les timestamps
  return new Date(adminEditedAt).getTime() > new Date(fournisseurUpdatedAt).getTime()
    ? "admin"
    : "fournisseur";
}
