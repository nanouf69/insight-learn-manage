import { QCM2_LYON } from '@/lib/pratiqueVtcLyonQcm2';

export const QUIZ_LYON_INITIAL_ID = 1785332774763;
/** Les 99 questions initiales gardent leurs IDs 1–99 ; les ajouts prennent 100–138, à la fin. */
export const PREMIER_ID_AJOUT_LYON = 100;

export const QUESTIONS_AJOUT_LYON = QCM2_LYON.questions.map((q, i) => ({
  id: PREMIER_ID_AJOUT_LYON + i,
  enonce: q.enonce,
  choix: q.choix.map(c => ({ lettre: c.lettre, texte: c.texte, ...('correct' in c && c.correct ? { correct: true } : {}) })),
  explication: q.explication,
  imageSize: 'sm',
  sourceLivreLyon: q.sourceQuestion,
}));

type Question = { id: number | string; enonce?: string };
type Exercice = { id: number | string; questions?: Question[] };

const norm = (s?: string) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Ajout d'affichage, additif et idempotent : questions initiales intactes (même objet, même ordre). */
export function fusionnerQuizLyon<T extends { id: number; exercices: Exercice[] }>(module: T): T {
  if (module.id !== 8) return module;
  return {
    ...module,
    exercices: module.exercices.map(exo => {
      if (Number(exo.id) !== QUIZ_LYON_INITIAL_ID || !Array.isArray(exo.questions)) return exo;
      const ids = new Set(exo.questions.map(q => Number(q.id)));
      const textes = new Set(exo.questions.map(q => norm(q.enonce)));
      const ajouts = QUESTIONS_AJOUT_LYON.filter(q => !ids.has(q.id) && !textes.has(norm(q.enonce)));
      return ajouts.length ? { ...exo, questions: [...exo.questions, ...ajouts] } : exo;
    }),
  };
}

/** Avant tout enregistrement admin : retire les ajouts d'affichage pour ne jamais les écrire en base. */
export function retirerAjoutsQuizLyon<T>(moduleId: number, data: T): T {
  const d = data as unknown as { exercices?: Array<Exercice & { questions?: Array<Question & { sourceLivreLyon?: number }> }> };
  if (moduleId !== 8 || !Array.isArray(d?.exercices)) return data;
  return {
    ...d,
    exercices: d.exercices.map(exo => Number(exo.id) !== QUIZ_LYON_INITIAL_ID || !Array.isArray(exo.questions) ? exo
      : { ...exo, questions: exo.questions.filter(q => q.sourceLivreLyon === undefined) }),
  } as unknown as T;
}
