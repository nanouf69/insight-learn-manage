/**
 * Projection d'affichage « Bilan d'exercices = somme exacte de ses sources ».
 *
 * Le JSON enregistré n'est jamais réécrit par la projection. Les objets
 * historiques retrouvés conservent leur identité et leur contenu ; les objets
 * hors composition restent en base. Les bilans d'examen et examens blancs ne
 * sont pas référencés ici et restent strictement hors périmètre.
 */

export type QuestionBilanJson = {
  id: number;
  question_id?: string;
  enonce?: string;
  choix?: unknown;
  image?: string;
  imageSize?: string;
  explication?: string;
  source_exercice_id?: number;
  source_question_id?: number;
  [cle: string]: unknown;
};

export type ExerciceBilanJson = {
  id: number;
  questions?: QuestionBilanJson[];
  deletedQuestionIds?: number[];
  [cle: string]: unknown;
};

type ConfigurationBilan = {
  moduleCours: 2 | 10;
  correspondances: Record<number, number[]>;
};

/** Modules de bilans d'exercices uniquement, y compris les héritages FC. */
export const BILAN_SOMME_COURS_SOURCES: Record<number, ConfigurationBilan> = {
  4: {
    moduleCours: 2,
    correspondances: {
      100: [1, 2], 101: [60, 61, 62], 102: [80, 81, 82], 103: [50],
      104: [7], 105: [3, 4, 5, 6], 106: [72],
    },
  },
  9: {
    moduleCours: 10,
    correspondances: {
      100: [1, 2], 101: [60, 61, 62], 102: [80, 81, 82], 103: [50],
      105: [3, 4, 5, 6], 203: [70, 71], 204: [73, 76, 74, 75],
    },
  },
  27: {
    moduleCours: 10,
    correspondances: { 250: [70, 71], 251: [73, 76, 74, 75] },
  },
  29: {
    moduleCours: 2,
    correspondances: { 103: [50], 104: [7], 105: [3, 4, 5, 6], 106: [72] },
  },
  81: {
    moduleCours: 2,
    correspondances: { 100: [1, 2], 102: [80, 81, 82], 104: [7], 106: [72] },
  },
  82: {
    moduleCours: 10,
    correspondances: { 100: [1, 2], 102: [80, 81, 82], 203: [70, 71], 204: [73, 76, 74, 75] },
  },
};

export const projectionSommeCoursActive = (moduleId: number, exerciceId?: number): boolean => {
  const config = BILAN_SOMME_COURS_SOURCES[Number(moduleId)];
  if (!config) return false;
  return exerciceId === undefined
    ? Object.keys(config.correspondances).length > 0
    : Boolean(config.correspondances[Number(exerciceId)]);
};

/** Base d'identifiants réservée aux questions sources sans historique bilan. */
const ID_AFFICHAGE_NOUVEAU = 900000;

const normaliserEnonce = (valeur: unknown): string =>
  String(valeur ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const cleSource = (exerciceId: unknown, questionId: unknown): string | null => {
  const exo = Number(exerciceId);
  const q = Number(questionId);
  return Number.isFinite(exo) && Number.isFinite(q) && exo > 0 && q > 0 ? `${exo}:${q}` : null;
};

export type ProjectionBilanOptions = {
  /** Conserver énoncé, choix, images et tout autre contenu de l'objet historique. */
  preserverContenuExistant?: boolean;
  /** Ancienne composition utilisée seulement pour retrouver les IDs legacy sans référence. */
  exercicesCoursDeReference?: ExerciceBilanJson[];
};

/**
 * Construit la composition exacte des sources, dans leur ordre. Une question
 * source sans historique reçoit une identité déterministe source/question ;
 * toute collision avec un historique est refusée au lieu d'écraser une preuve.
 */
export function projeterExerciceBilanDepuisCours(
  exerciceBilan: ExerciceBilanJson,
  exercicesCours: ExerciceBilanJson[],
  options: ProjectionBilanOptions = {},
): QuestionBilanJson[] {
  const questionsCours = exercicesCours.flatMap((exo) => {
    if (!exo || !Array.isArray(exo.questions)) {
      throw new Error(`Bilan somme des cours : section source ${exo?.id ?? "absente"} indisponible.`);
    }
    // Zéro question est valide uniquement lorsque des suppressions explicites
    // le prouvent ; une section vide accidentelle ne doit jamais vider le bilan.
    if (exo.questions.length === 0 && (exo.deletedQuestionIds?.length ?? 0) === 0) {
      throw new Error(`Bilan somme des cours : section source ${exo.id} vide sans suppression explicite.`);
    }
    return exo.questions.map((q) => ({ ...q, _sourceExo: Number(exo.id) }));
  });

  const referenceParCle = new Map<string, string>();
  for (const exo of options.exercicesCoursDeReference ?? []) {
    for (const question of exo.questions ?? []) {
      const cle = cleSource(exo.id, question.id);
      if (cle) referenceParCle.set(cle, normaliserEnonce(question.enonce));
    }
  }

  const historiques = Array.isArray(exerciceBilan.questions) ? exerciceBilan.questions : [];
  const identitesHistoriques = new Set(historiques.map((q) => Number(q.id)));
  const parCleSource = new Map<string, QuestionBilanJson>();
  const parEnonce = new Map<string, QuestionBilanJson[]>();
  for (const q of historiques) {
    const cle = cleSource(q.source_exercice_id, q.source_question_id);
    if (cle && !parCleSource.has(cle)) parCleSource.set(cle, q);
    const enonce = normaliserEnonce(q.enonce);
    if (enonce) {
      const liste = parEnonce.get(enonce) ?? [];
      liste.push(q);
      parEnonce.set(enonce, liste);
    }
  }

  const identitesUtilisees = new Set<number>();
  return questionsCours.map((questionCours) => {
    const { _sourceExo, ...contenu } = questionCours as QuestionBilanJson & { _sourceExo: number };
    const cle = cleSource(_sourceExo, contenu.id);
    let historique = cle ? parCleSource.get(cle) : undefined;
    if (!historique) {
      const candidats = parEnonce.get(normaliserEnonce(contenu.enonce)) ?? [];
      historique = candidats.find((q) => !identitesUtilisees.has(Number(q.id)));
    }
    if (!historique && cle && referenceParCle.has(cle)) {
      // Les anciennes entrées sans source_exercice_id/source_question_id ont
      // été rapprochées par leur énoncé. Une édition du texte ne doit pas leur
      // faire perdre leur identité historique : on compare alors à la référence.
      const candidats = parEnonce.get(referenceParCle.get(cle)!) ?? [];
      historique = candidats.find((q) => !identitesUtilisees.has(Number(q.id)));
    }
    if (historique) {
      identitesUtilisees.add(Number(historique.id));
      if (options.preserverContenuExistant) {
        return {
          ...historique,
          source_exercice_id: _sourceExo,
          source_question_id: Number(contenu.id),
        };
      }
      return {
        ...contenu,
        id: Number(historique.id),
        ...(historique.question_id ? { question_id: historique.question_id } : {}),
        source_exercice_id: _sourceExo,
        source_question_id: Number(contenu.id),
      };
    }

    const idAffichage = ID_AFFICHAGE_NOUVEAU + _sourceExo * 1000 + Number(contenu.id);
    if (identitesHistoriques.has(idAffichage) || identitesUtilisees.has(idAffichage)) {
      throw new Error(`Bilan somme des cours : collision d'identité pour la source ${cle ?? "inconnue"}.`);
    }
    identitesUtilisees.add(idAffichage);
    return {
      ...contenu,
      id: idAffichage,
      source_exercice_id: _sourceExo,
      source_question_id: Number(contenu.id),
    };
  });
}

/** Applique la projection aux seuls bilans d'exercices configurés. */
export function projeterBilanDepuisCours<T extends ExerciceBilanJson>(
  moduleBilanId: number,
  exercicesBilan: T[],
  exercicesCours: ExerciceBilanJson[],
  options: ProjectionBilanOptions = {},
): T[] {
  const config = BILAN_SOMME_COURS_SOURCES[moduleBilanId];
  if (!config) return exercicesBilan;
  return exercicesBilan.map((exercice) => {
    const sourcesIds = config.correspondances[Number(exercice.id)];
    if (!sourcesIds) return exercice;
    const sources = sourcesIds.map((id) => {
      const trouve = exercicesCours.find((exo) => Number(exo.id) === id);
      if (!trouve) throw new Error(`Bilan somme des cours : exercice source ${id} absent du module cours.`);
      return trouve;
    });
    return { ...exercice, questions: projeterExerciceBilanDepuisCours(exercice, sources, options) };
  });
}

/**
 * Protection d'enregistrement : avant toute sauvegarde, chaque exercice projeté
 * reprend exactement les questions serveur ; seules les intentions explicites
 * appliquées ensuite peuvent modifier le contenu.
 */
export function retablirExercicesProjetesDuServeur<T extends ExerciceBilanJson>(
  moduleBilanId: number,
  exercices: T[],
  exercicesServeur: ExerciceBilanJson[] | null | undefined,
): T[] {
  const config = BILAN_SOMME_COURS_SOURCES[moduleBilanId];
  if (!config || !Array.isArray(exercicesServeur)) return exercices;
  return exercices.map((exercice) => {
    if (!config.correspondances[Number(exercice.id)]) return exercice;
    const serveur = exercicesServeur.find((exo) => Number(exo.id) === Number(exercice.id));
    if (!serveur || !Array.isArray(serveur.questions)) return exercice;
    return { ...exercice, questions: serveur.questions };
  });
}
