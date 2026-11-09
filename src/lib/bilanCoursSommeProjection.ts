/**
 * Projection d'affichage « Bilan = somme exacte des questions du cours ».
 *
 * Le Bilan exercices TAXI (module 9) peut afficher les questions des sections
 * correspondantes de « Cours et exercices TAXI » (module 10), dans leur ordre.
 * Projection en mémoire uniquement : le JSON enregistré du module 9 n'est
 * jamais réécrit, les questions historiques restent en base et leurs identités
 * sont conservées afin que réponses et résultats restent rattachés.
 *
 * Depuis le 09/11, seule la matière T3P (exercice 100) est active : exactement
 * 66 questions de la partie 1 puis 62 de la partie 2. Gestion et toutes les
 * autres matières conservent leur affichage enregistré.
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
  [cle: string]: unknown;
};

/** Module bilan -> module cours -> { exercice bilan : exercices cours dans l'ordre }. */
export const BILAN_SOMME_COURS_SOURCES: Record<number, { moduleCours: number; correspondances: Record<number, number[]> }> = {
  9: { moduleCours: 10, correspondances: { 100: [1, 2], 101: [60, 61, 62] } },
};

/** Seul T3P est projeté ; Gestion reste explicitement hors du correctif du 09/11. */
const BILAN_SOMME_COURS_EXERCICES_ACTIFS: Record<number, ReadonlySet<number>> = {
  9: new Set([100]),
};

export const projectionSommeCoursActive = (moduleId: number, exerciceId?: number): boolean => {
  const actifs = BILAN_SOMME_COURS_EXERCICES_ACTIFS[Number(moduleId)];
  if (!actifs || !BILAN_SOMME_COURS_SOURCES[Number(moduleId)]) return false;
  return exerciceId === undefined ? actifs.size > 0 : actifs.has(Number(exerciceId));
};

/** Préfixe d'identifiant d'affichage pour une question du cours sans historique bilan. */
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
};

/**
 * Construit les questions affichées d'un exercice de bilan à partir des
 * exercices du cours. Lève une erreur si une section source est absente ou
 * vide : l'appelant conserve alors l'affichage précédent, jamais un vide.
 */
export function projeterExerciceBilanDepuisCours(
  exerciceBilan: ExerciceBilanJson,
  exercicesCours: ExerciceBilanJson[],
  options: ProjectionBilanOptions = {},
): QuestionBilanJson[] {
  const questionsCours = exercicesCours.flatMap((exo) => {
    if (!exo || !Array.isArray(exo.questions) || exo.questions.length === 0) {
      throw new Error(`Bilan somme des cours : section source ${exo?.id ?? "absente"} indisponible.`);
    }
    return exo.questions.map((q) => ({ ...q, _sourceExo: Number(exo.id) }));
  });

  const historiques = Array.isArray(exerciceBilan.questions) ? exerciceBilan.questions : [];
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
  return questionsCours.map((questionCours, index) => {
    const { _sourceExo, ...contenu } = questionCours as QuestionBilanJson & { _sourceExo: number };
    const cle = cleSource(_sourceExo, contenu.id);
    let historique = cle ? parCleSource.get(cle) : undefined;
    if (!historique) {
      const candidats = parEnonce.get(normaliserEnonce(contenu.enonce)) ?? [];
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
    return {
      ...contenu,
      id: ID_AFFICHAGE_NOUVEAU + index,
      source_exercice_id: _sourceExo,
      source_question_id: Number(contenu.id),
    };
  });
}

/**
 * Applique la projection aux seules matières explicitement actives.
 * Retourne les autres exercices inchangés (même référence). Lève une erreur
 * si une source active est indisponible.
 */
export function projeterBilanDepuisCours<T extends ExerciceBilanJson>(
  moduleBilanId: number,
  exercicesBilan: T[],
  exercicesCours: ExerciceBilanJson[],
  options: ProjectionBilanOptions = {},
): T[] {
  const config = BILAN_SOMME_COURS_SOURCES[moduleBilanId];
  if (!config) return exercicesBilan;
  return exercicesBilan.map((exercice) => {
    if (!projectionSommeCoursActive(moduleBilanId, Number(exercice.id))) return exercice;
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
 * Protection d'enregistrement : la projection est un affichage, jamais une
 * écriture. Avant une sauvegarde du module bilan, les exercices projetés
 * reprennent exactement les questions de la version serveur relue juste avant.
 */
export function retablirExercicesProjetesDuServeur<T extends ExerciceBilanJson>(
  moduleBilanId: number,
  exercices: T[],
  exercicesServeur: ExerciceBilanJson[] | null | undefined,
): T[] {
  const config = BILAN_SOMME_COURS_SOURCES[moduleBilanId];
  if (!config || !Array.isArray(exercicesServeur)) return exercices;
  return exercices.map((exercice) => {
    if (!projectionSommeCoursActive(moduleBilanId, Number(exercice.id))) return exercice;
    if (!config.correspondances[Number(exercice.id)]) return exercice;
    const serveur = exercicesServeur.find((exo) => Number(exo.id) === Number(exercice.id));
    if (!serveur || !Array.isArray(serveur.questions)) return exercice;
    return { ...exercice, questions: serveur.questions };
  });
}
