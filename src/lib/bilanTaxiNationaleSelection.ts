/** Read-only projection. Keep the existing Bilan identities, not the source IDs. */
export type BilanCanonicalRow = {
  question_id: string;
  quiz_id: string;
  section_id: number;
  legacy_question_id: number;
  position: number;
  active: boolean;
};

export function canonicalQuizIdsForDisplay(moduleId: number, quizIds: string[]): string[] {
  return moduleId === 9
    ? [...new Set([...quizIds, "reglementation-nationale", "reglementation-locale"])]
    : quizIds;
}

export function selectBilanTaxiNationaleRows<T extends BilanCanonicalRow>(
  moduleId: number,
  rows: T[],
): T[] {
  if (moduleId !== 9) return rows;
  const source = rows.filter(row => row.quiz_id === "reglementation-nationale" &&
    (row.section_id === 70 || row.section_id === 71) && row.active)
    .sort((a, b) => a.section_id - b.section_id || a.position - b.position);
  const counts = [70, 71].map(section => source.filter(row => row.section_id === section).length);
  if (counts[0] !== 64 || counts[1] !== 34 ||
      new Set(source.map(row => row.question_id)).size !== 98 ||
      new Set(source.map(row => `${row.section_id}:${row.legacy_question_id}`)).size !== 98) {
    throw new Error("Bilan TAXI nationale : source canonique indisponible ou décompte différent de 64 + 34.");
  }
  const identities = new Map(rows.filter(row => row.quiz_id === "bilan-exercices-taxi" && row.section_id === 203)
    .map(row => [row.legacy_question_id, row]));
  const projected = source.map((row, index) => {
    const id = row.section_id * 1000 + row.legacy_question_id;
    const historical = identities.get(id);
    if (!historical) throw new Error(`Bilan TAXI nationale : identité historique manquante ${id}.`);
    return { ...row, quiz_id: historical.quiz_id, section_id: 203,
      legacy_question_id: historical.legacy_question_id, question_id: historical.question_id,
      position: index + 1 };
  });
  return [...rows.filter(row => !(row.quiz_id === "bilan-exercices-taxi" && row.section_id === 203)), ...projected];
}

/**
 * Réglementation locale : le bilan affiche exactement la somme des questions
 * actives des quatre sections du cours (73, 76, 74, 75 = 29 + 22 + 25 + 29 = 105),
 * dans cet ordre. Les 242 lignes historiques de la section 204 ne sont jamais
 * supprimées : seules les identités correspondant aux questions du cours sont
 * reprises pour préserver les réponses et résultats enregistrés.
 */
const SECTIONS_LOCALES_ORDRE = [73, 76, 74, 75] as const;
const EFFECTIFS_LOCAUX_ATTENDUS: Record<number, number> = { 73: 29, 76: 29, 74: 22, 75: 25 };

export function selectBilanTaxiLocaleRows<T extends BilanCanonicalRow>(
  moduleId: number,
  rows: T[],
): T[] {
  if (moduleId !== 9) return rows;
  const source = SECTIONS_LOCALES_ORDRE.flatMap(section =>
    rows.filter(row => row.quiz_id === "reglementation-locale" && row.section_id === section && row.active)
      .sort((a, b) => a.position - b.position));
  const countsOk = SECTIONS_LOCALES_ORDRE.every(
    section => source.filter(row => row.section_id === section).length === EFFECTIFS_LOCAUX_ATTENDUS[section]);
  if (!countsOk || source.length !== 105 ||
      new Set(source.map(row => row.question_id)).size !== 105 ||
      new Set(source.map(row => `${row.section_id}:${row.legacy_question_id}`)).size !== 105) {
    throw new Error("Bilan TAXI locale : source canonique indisponible ou décompte différent de 29 + 29 + 22 + 25.");
  }
  const identities = new Map(rows.filter(row => row.quiz_id === "bilan-exercices-taxi" && row.section_id === 204)
    .map(row => [row.legacy_question_id, row]));
  const projected = source.map((row, index) => {
    const id = row.section_id * 1000 + row.legacy_question_id;
    const historical = identities.get(id);
    if (!historical) throw new Error(`Bilan TAXI locale : identité historique manquante ${id}.`);
    return { ...row, quiz_id: historical.quiz_id, section_id: 204,
      legacy_question_id: historical.legacy_question_id, question_id: historical.question_id,
      position: index + 1 };
  });
  return [...rows.filter(row => !(row.quiz_id === "bilan-exercices-taxi" && row.section_id === 204)), ...projected];
}

/** Projection complète du bilan TAXI : nationale (203) puis locale (204). */
export function selectBilanTaxiDisplayRows<T extends BilanCanonicalRow>(
  moduleId: number,
  rows: T[],
): T[] {
  return selectBilanTaxiLocaleRows(moduleId, selectBilanTaxiNationaleRows(moduleId, rows));
}

/** Historical passages remain their original content, including retired questions. */
export function preserveTaxiNationalSnapshot(moduleId: number, exerciseId: number): boolean {
  return moduleId === 9 && exerciseId === 203;
}

/** TA display only. Keep the TAXI helpers and all save/readback paths unchanged.
 * Its existing bindings map shared sections 203/204 to TA exercises 250/251.
 * The unbound old TA set is not read.
 */
export function canonicalQuizIdsForNationalDisplay(moduleId: number, quizIds: string[]): string[] {
  return canonicalQuizIdsForDisplay(moduleId === 27 ? 9 : moduleId, quizIds);
}

export function selectBilanNationalDisplayRows<T extends BilanCanonicalRow>(moduleId: number, rows: T[]): T[] {
  return selectBilanTaxiDisplayRows(moduleId === 27 ? 9 : moduleId, rows);
}
