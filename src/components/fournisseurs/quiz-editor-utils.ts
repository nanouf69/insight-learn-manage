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
 *
 * Règle validée : la modification RÉELLEMENT la plus récente gagne, qu'elle
 * vienne de l'Admin ou du fournisseur/formateur. Jamais de « l'Admin gagne
 * toujours ».
 *
 * Référence de date côté Admin, par ordre de fiabilité :
 *   1. `adminEditedAt` (marqueur `_editedAt` posé sur la question)
 *   2. `adminFallbackAt` : date réelle de dernière écriture enregistrée
 *      automatiquement par la base (module_editor_state.updated_at) ou date
 *      issue du journal des modifications (module_admin_audit_log).
 *
 * Cas particuliers :
 *   - version fournisseur sans horodatage exploitable → considérée comme
 *     ancienne, elle n'écrase rien ("admin") ;
 *   - aucune date exploitable des deux côtés → "conflit" : aucune des deux
 *     versions n'est écrasée automatiquement, le conflit est signalé ;
 *   - égalité stricte → l'Admin garde la main.
 */
export function resolveOverrideConflict(
  adminEditedAt: string | undefined,
  fournisseurUpdatedAt: string,
  adminFallbackAt?: string | null,
): "admin" | "fournisseur" | "conflit" {
  const fournisseurTs = Date.parse(fournisseurUpdatedAt);
  // Une version fournisseur SANS horodatage exploitable est considérée comme la
  // plus ancienne : elle ne peut jamais écraser la version Admin.
  if (!Number.isFinite(fournisseurTs)) return "admin";

  const parsed = [adminEditedAt, adminFallbackAt]
    .map((v) => (v ? Date.parse(v) : NaN))
    .filter((n) => Number.isFinite(n)) as number[];

  // Aucune date fiable côté Admin : on n'écrase rien automatiquement.
  if (parsed.length === 0) return "conflit";

  const adminTs = Math.max(...parsed);
  return fournisseurTs > adminTs ? "fournisseur" : "admin";
}

/**
 * Journal des modifications Admin : dernière date connue par question.
 * Clé : `${exercice_id}-${question_id}`.
 */
export function buildAdminEditJournalMap(
  rows: Array<{ exercice_id?: string | null; question_id?: string | null; created_at?: string | null }> | null | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows ?? []) {
    const exo = row?.exercice_id;
    const qid = row?.question_id;
    const at = row?.created_at;
    if (!exo || !qid || !at) continue;
    const key = `${exo}-${qid}`;
    const previous = map.get(key);
    if (!previous || Date.parse(at) > Date.parse(previous)) map.set(key, at);
  }
  return map;
}

