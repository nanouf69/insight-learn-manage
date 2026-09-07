/**
 * Synchronisation des quiz du portail fournisseur avec les MODULES DE COURS.
 *
 * Règle métier : les modules de cours (table `module_editor_state`, éditée par
 * l'admin) sont la SOURCE DE VÉRITÉ. Le portail fournisseur affichait jusqu'ici
 * les données statiques du code, donc des questions/réponses périmées dès que
 * l'admin modifiait le module.
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
 * Le module dont l'`updated_at` est le plus récent gagne en cas de doublon.
 */
export function buildModuleQuestionMap(
  rows: { module_data: any; updated_at?: string | null }[] | null | undefined,
): Map<number, SyncQuestion[]> {
  const map = new Map<number, SyncQuestion[]>();
  const stamps = new Map<number, number>();

  for (const row of rows ?? []) {
    const ts = row.updated_at ? Date.parse(row.updated_at) : 0;
    const exercices = (row?.module_data?.exercices ?? []) as any[];
    for (const exo of exercices) {
      if (!exo || !Array.isArray(exo.questions)) continue;
      const id = Number(exo.id);
      if (!Number.isFinite(id)) continue;
      const prev = stamps.get(id);
      if (prev !== undefined && prev >= (Number.isFinite(ts) ? ts : 0)) continue;
      stamps.set(id, Number.isFinite(ts) ? ts : 0);
      map.set(id, exo.questions as SyncQuestion[]);
    }
  }
  return map;
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
