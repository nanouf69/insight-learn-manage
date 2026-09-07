/**
 * Synchronisation des quiz du portail fournisseur avec les MODULES DE COURS.
 *
 * Règle métier : la dernière question enregistrée, qu'elle vienne d'une
 * occurrence admin ou du fournisseur, est la version de référence.
 *
 * Ici on remplace, pour chaque section (= exercice), les questions statiques par
 * celles enregistrées dans le module correspondant. Si un exercice n'existe pas
 * (encore) en base, on garde la version statique — aucune question n'est perdue.
 */

/** quiz_id du portail fournisseur → modules de cours qui portent ce quiz */
export const QUIZ_ID_TO_MODULE_IDS: Record<string, number[]> = {
  "reglementation-nationale": [10, 24, 40],
  "reglementation-locale": [10, 24, 40, 42],
  "connaissance-ville": [7],
  "equipements-taxi": [64],
  "cas-pratique-taxi": [12],
  "controle-connaissances-taxi": [13],
  "bilan-exercices-taxi": [9],
  "bilan-exercices-ta": [27],
  "bilan-examen-taxi": [11],
  "bilan-examen-ta": [28],
};

export interface SyncChoice {
  lettre: string;
  texte: string;
  correct?: boolean;
}

export interface SyncQuestion {
  id: number;
  enonce: string;
  choix: SyncChoice[];
  _editedAt?: string;
  manually_edited?: boolean;
}

export interface SyncSection {
  id: number;
  titre: string;
  sousTitre?: string;
  questions?: SyncQuestion[];
}

/**
 * Construit une map exerciceId → questions à partir des `module_data` des modules.
 * La structure de l'occurrence la plus récente fait référence (ordre,
 * ajouts/suppressions), puis chaque question est remplacée par sa version dont
 * `_editedAt` est le plus récent. `updated_at` ne sert que de repli historique.
 */
export function buildModuleQuestionMap(
  rows: { module_data: any; updated_at?: string | null }[] | null | undefined,
): Map<number, SyncQuestion[]> {
  type ExerciseCandidate = { questions: SyncQuestion[]; rowTimestamp: number };
  const candidates = new Map<number, ExerciseCandidate[]>();

  for (const row of rows ?? []) {
    const ts = row.updated_at ? Date.parse(row.updated_at) : 0;
    const exercices = (row?.module_data?.exercices ?? []) as any[];
    for (const exo of exercices) {
      if (!exo || !Array.isArray(exo.questions)) continue;
      const id = Number(exo.id);
      if (!Number.isFinite(id)) continue;
      const existing = candidates.get(id) ?? [];
      existing.push({
        questions: exo.questions as SyncQuestion[],
        rowTimestamp: Number.isFinite(ts) ? ts : 0,
      });
      candidates.set(id, existing);
    }
  }

  const map = new Map<number, SyncQuestion[]>();
  for (const [exerciseId, exerciseCandidates] of candidates) {
    const structuralSource = [...exerciseCandidates].sort((a, b) => b.rowTimestamp - a.rowTimestamp)[0];
    if (!structuralSource) continue;

    const merged = structuralSource.questions.map((baselineQuestion) => {
      let winner = baselineQuestion;
      let winnerTimestamp = questionTimestamp(baselineQuestion, structuralSource.rowTimestamp);

      for (const candidate of exerciseCandidates) {
        const sameQuestion = candidate.questions.find(
          (question) => Number(question.id) === Number(baselineQuestion.id),
        );
        if (!sameQuestion) continue;
        const candidateTimestamp = questionTimestamp(sameQuestion, candidate.rowTimestamp);
        if (candidateTimestamp > winnerTimestamp) {
          winner = sameQuestion;
          winnerTimestamp = candidateTimestamp;
        }
      }
      return winner;
    });
    map.set(exerciseId, merged);
  }
  return map;
}

function questionTimestamp(question: SyncQuestion, fallback: number): number {
  if (!question._editedAt) return fallback;
  const timestamp = Date.parse(question._editedAt);
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

/**
 * Applique les questions des modules sur les sections statiques du portail.
 * Ne supprime jamais une section : si le module n'a pas l'exercice, on garde
 * la version statique.
 */
export function applyModuleQuestionsToSections<T extends SyncSection>(
  sections: T[],
  moduleQuestions: Map<number, SyncQuestion[]>,
): T[] {
  if (!moduleQuestions.size) return sections;
  return sections.map((section) => {
    const questions = moduleQuestions.get(Number(section.id));
    if (!questions) return section;
    return { ...section, questions };
  });
}
