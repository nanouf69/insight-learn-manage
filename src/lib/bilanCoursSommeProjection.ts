/**
 * Projection d'affichage « Bilan = somme exacte des questions du cours ».
 *
 * Pour les matières sans quiz canonique (T3P, Gestion), le Bilan exercices TAXI
 * (module 9) affiche exactement les questions des sections correspondantes de
 * « Cours et exercices TAXI » (module 10), dans leur ordre. Projection en
 * mémoire uniquement : le JSON enregistré du module 9 n'est jamais réécrit,
 * les questions historiques du bilan restent en base et les identités
 * historiques sont conservées quand la question existe déjà dans le bilan,
 * afin que les réponses et résultats enregistrés restent rattachés.
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

/** Préfixe d'identifiant d'affichage pour une question du cours sans historique bilan. */
const ID_AFFICHAGE_NOUVEAU = 900000;

const normaliserEnonce = (valeur: unknown): string =>
  String(valeur ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const cleSource = (exerciceId: unknown, questionId: unknown): string | null => {
  const exo = Number(exerciceId);
  const q = Number(questionId);
  return Number.isFinite(exo) && Number.isFinite(q) && exo > 0 && q > 0 ? `${exo}:${q}` : null;
};

/**
 * Construit les questions affichées d'un exercice de bilan à partir des
 * exercices du cours. Lève une erreur si une section source est absente ou
 * vide : l'appelant conserve alors l'affichage précédent, jamais un vide.
 */
export function projeterExerciceBilanDepuisCours(
  exerciceBilan: ExerciceBilanJson,
  exercicesCours: ExerciceBilanJson[],
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
 * Applique la projection à toutes les matières configurées du module bilan.
 * Retourne les exercices inchangés (même référence) si le module n'est pas
 * concerné. Lève une erreur si une source est indisponible.
 */
export function projeterBilanDepuisCours<T extends ExerciceBilanJson>(
  moduleBilanId: number,
  exercicesBilan: T[],
  exercicesCours: ExerciceBilanJson[],
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
    return { ...exercice, questions: projeterExerciceBilanDepuisCours(exercice, sources) };
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
    if (!config.correspondances[Number(exercice.id)]) return exercice;
    const serveur = exercicesServeur.find((exo) => Number(exo.id) === Number(exercice.id));
    if (!serveur || !Array.isArray(serveur.questions)) return exercice;
    return { ...exercice, questions: serveur.questions };
  });
}
