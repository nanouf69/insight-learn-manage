export interface CanonicalQuizChoice {
  lettre: string;
  texte: string;
  correct?: boolean;
}

export interface CanonicalQuizQuestion {
  id: number;
  question_id?: string;
  enonce: string;
  choix: CanonicalQuizChoice[];
  _editedAt?: string;
  manually_edited?: boolean;
}

export interface CanonicalQuizSection {
  id: number;
  titre: string;
  sousTitre?: string;
  questions?: CanonicalQuizQuestion[];
}

export interface CanonicalQuizRow {
  question_id: string;
  section_id: number;
  legacy_question_id: number;
  position: number;
  enonce: string;
  choix: CanonicalQuizChoice[];
  active: boolean;
  updated_at: string;
}

/**
 * Une section qui possède au moins une ligne canonique reste pilotée par la base,
 * même lorsque toutes ses questions sont désactivées. Cela interdit le retour à
 * l'ancienne liste statique après la suppression de la dernière question active.
 */
export function applyCanonicalRowsToSections<T extends CanonicalQuizSection>(
  sourceSections: T[],
  canonicalRows: CanonicalQuizRow[],
  authoritativeSectionIds: ReadonlySet<number> = new Set(
    canonicalRows.map((row) => Number(row.section_id)),
  ),
): T[] {
  return sourceSections.map((section) => {
    const sectionRows = canonicalRows.filter(
      (row) => Number(row.section_id) === Number(section.id),
    );

    if (!authoritativeSectionIds.has(Number(section.id))) return section;

    const questions = sectionRows
      .filter((row) => row.active)
      .sort(
        (a, b) =>
          Number(a.position) - Number(b.position) ||
          Number(a.legacy_question_id) - Number(b.legacy_question_id),
      )
      .map((row) => ({
        id: Number(row.legacy_question_id),
        question_id: row.question_id,
        enonce: row.enonce,
        choix: Array.isArray(row.choix) ? row.choix : [],
        _editedAt: row.updated_at,
        manually_edited: true,
      }));

    return { ...section, questions };
  });
}