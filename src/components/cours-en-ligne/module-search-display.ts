// ======================================================================
// Recherche « Gestion des modules » : chercher dans les questions réellement
// affichées par le module (banque canonique + sélection nationale/locale),
// et non dans l'ancienne copie JSON. Lecture seule, affichage uniquement.
// ======================================================================
import { selectBilanNationalDisplayRows } from "@/lib/bilanTaxiNationaleSelection";

export type SearchCanonicalRow = {
  question_id: string;
  quiz_id: string;
  section_id: number;
  legacy_question_id: number;
  position: number;
  enonce: string;
  choix: any[] | null;
  explication: string | null;
  active: boolean;
};

export type SearchCanonicalBinding = { module_id: number; quiz_id: string; exercise_id: number; section_id: number };

/** Mêmes sources que l'affichage des modules cherchables (ModuleDetailView). */
export const SEARCH_CANONICAL_QUIZ_IDS: Record<number, string[]> = {
  2: ["dev-commercial", "reglementation-specifique-vtc"],
  41: ["dev-commercial", "reglementation-specifique-vtc"],
  9: ["bilan-exercices-taxi", "reglementation-nationale", "reglementation-locale"],
  27: ["bilan-exercices-taxi", "reglementation-nationale", "reglementation-locale"],
  10: ["reglementation-nationale", "reglementation-locale"],
  40: ["reglementation-nationale", "reglementation-locale"],
  11: ["bilan-examen-taxi"],
  28: ["bilan-examen-taxi"],
};

/**
 * Remplace, pour chaque exercice rattaché à la banque, les questions par celles
 * que le module affiche réellement. Exercices non rattachés : inchangés.
 */
export function exercicesAffichesPourRecherche(
  moduleId: number,
  exercices: any[],
  rows: SearchCanonicalRow[],
  bindings: SearchCanonicalBinding[],
): any[] {
  const quizIds = SEARCH_CANONICAL_QUIZ_IDS[moduleId];
  const moduleBindings = bindings.filter((b) => Number(b.module_id) === moduleId);
  if (!quizIds || moduleBindings.length === 0) return exercices;
  const moduleRows = rows.filter((r) => quizIds.includes(r.quiz_id));
  let selected: SearchCanonicalRow[];
  try {
    selected = selectBilanNationalDisplayRows(moduleId, moduleRows);
  } catch {
    return exercices; // source incohérente : on garde la recherche actuelle
  }
  const bySection = new Map<number, SearchCanonicalRow[]>();
  for (const b of moduleBindings) {
    const list = selected
      .filter((r) => r.quiz_id === b.quiz_id && Number(r.section_id) === Number(b.section_id) && r.active)
      .sort((a, c) => Number(a.position) - Number(c.position) || Number(a.legacy_question_id) - Number(c.legacy_question_id));
    bySection.set(Number(b.exercise_id), [...(bySection.get(Number(b.exercise_id)) ?? []), ...list]);
  }
  return exercices.map((ex) => {
    const list = bySection.get(Number(ex?.id));
    if (!list) return ex;
    return {
      ...ex,
      questions: list.map((r) => ({
        id: Number(r.legacy_question_id),
        enonce: r.enonce,
        choix: Array.isArray(r.choix) ? r.choix : [],
        ...(r.explication ? { explication: r.explication } : {}),
      })),
    };
  });
}
