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
  return moduleId === 9 ? [...new Set([...quizIds, "reglementation-nationale"])] : quizIds;
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

/** Historical passages remain their original content, including retired questions. */
export function preserveTaxiNationalSnapshot(moduleId: number, exerciseId: number): boolean {
  return moduleId === 9 && exerciseId === 203;
}