/**
 * Extracted helper functions from exam components.
 * These are the REAL functions used by CorrectionQRCTab, ExamensBlancsPage,
 * ExamensBlancsEditor, and ExamenBlancsPassage.
 *
 * Extracting them here makes them testable and ensures
 * the components use the same logic (single source of truth).
 */
import type { ExamenBlanc, Matiere, Question } from "./examens-blancs-data";

// ─── From CorrectionQRCTab.tsx:167-172 ───────────────────────────────────

/**
 * Build a map of exam ID → ExamenBlanc from source + saved.
 * loadSavedExamens already does a proper merge (source + DB overrides),
 * so we just use its result and fall back to source if not found.
 */
export function buildExamenMap(
  sourceExamens: ExamenBlanc[],
  savedExamens: ExamenBlanc[],
): Record<string, ExamenBlanc> {
  const map: Record<string, ExamenBlanc> = {};
  for (const e of sourceExamens) {
    const s = savedExamens.find((saved) => saved.id === e.id);
    map[e.id] = s || e;
  }
  return map;
}

// ─── From CorrectionQRCTab.tsx:219 ───────────────────────────────────────

/**
 * Check if a result row should be skipped in QRC processing.
 * FIX: only skip when details itself is null/undefined.
 */
export function shouldSkipResultRow(details: any): boolean {
  if (details == null) return true;
  return false;
}

// ─── From ExamensBlancsPage.tsx:681-695 ──────────────────────────────────

/**
 * Build question details for saving to apprenant_quiz_results.
 * FIX: falls back to source when matiere.questions is empty,
 * and tries both numeric and string keys for reponses.
 */
export function buildQuestionDetails(
  matiere: Matiere,
  reponses: Record<string | number, any>,
  tousLesExamens: ExamenBlanc[],
): Array<{ questionId: number; enonce: string; type: string; reponseEleve: any; reponseCorrecte: any }> {
  let rawQuestions = matiere?.questions || [];
  // FIX: fallback to source when questions are empty
  if (rawQuestions.length === 0 && matiere?.id) {
    for (const exam of tousLesExamens) {
      const srcMat = exam.matieres.find(m => m.id === matiere.id);
      if (srcMat?.questions?.length) { rawQuestions = srcMat.questions; break; }
    }
  }
  const questionsSafe = rawQuestions.filter(q => q != null);
  return questionsSafe.map((q: Question) => {
    if (!q) return null;
    // FIX: try both numeric and string keys (JSON round-trip makes keys strings)
    const rep = reponses?.[q.id] ?? reponses?.[String(q.id)];
    return {
      questionId: q.id, enonce: q.enonce || "", type: q?.type || "QCM",
      reponseEleve: rep ?? null,
      reponseCorrecte: q?.type === "QCM" && q.choix
        ? q.choix.filter(c => c.correct).map(c => c.lettre)
        : (q.reponseQRC || (q.reponses_possibles || []).join(" / ")),
    };
  }).filter(Boolean) as any[];
}

// ─── From ExamenBlancsPassage.tsx:214 & ExamensBlancsPage.tsx:738 ────────

/**
 * Build the exercice_id key for reponses_apprenants.
 * FIX: both auto-save and flush use the same double underscore `__`.
 */
export function buildExerciceKeyAutoSave(examenId: string, matiereId: string): string {
  return `${examenId || "exam"}__${matiereId}`;
}

export function buildExerciceKeyFlush(examenId: string, matiereId: string): string {
  return `${examenId}__${matiereId}`;
}

// ─── From ExamensBlancsPage.tsx:109-110 ──────────────────────────────────

/**
 * Check if examenChoisi should be protected from replacement.
 * FIX: also protects "resultats" phase.
 */
export function isExamPhaseProtected(phase: string): boolean {
  return phase === "examen" || phase === "transition" || phase === "resultats";
}

// ─── From ExamensBlancsEditor.tsx:261 ────────────────────────────────────

const normalizeQuestionType = (value: unknown) => String(value ?? "").trim().toUpperCase();
const normalizeQuestionText = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Build a merge key for question matching during loadSavedExamens.
 * FIX: includes enonce to prevent cross-exam collisions.
 */
export function getQuestionKey(value: any): string {
  const id = Number(value?.id);
  const type = normalizeQuestionType(value?.type);
  const enonce = normalizeQuestionText(value?.enonce);
  if (enonce) return `${id}::${type}::${enonce}`;
  return `${id}::${type}`;
}
