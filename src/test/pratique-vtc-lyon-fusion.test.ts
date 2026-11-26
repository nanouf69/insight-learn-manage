import { describe, expect, it } from 'vitest';
import { fusionnerQuizLyon, retirerAjoutsQuizLyon, QUIZ_LYON_INITIAL_ID, QUESTIONS_AJOUT_LYON } from '@/lib/pratiqueVtcLyonFusion';

const initiales = Array.from({ length: 99 }, (_, i) => ({ id: i + 1, enonce: `Question initiale ${i + 1}`, choix: [{ lettre: 'A', texte: 'x', correct: true }] }));
const module8 = () => ({ id: 8, exercices: [{ id: 99, questions: [] }, { id: QUIZ_LYON_INITIAL_ID, titre: 'Quizz Ville De Lyon', questions: initiales }] });

describe('Fusion des QCM du livre dans le quiz Lyon initial', () => {
  it('passe de 99 à 138 questions, originales intactes et dans le même ordre, ajouts à la fin', () => {
    const avant = module8();
    const apres = fusionnerQuizLyon(avant);
    const quiz = apres.exercices[1];
    expect(quiz.questions).toHaveLength(138);
    quiz.questions.slice(0, 99).forEach((q, i) => expect(q).toBe(initiales[i]));
    expect(quiz.questions.slice(99).map(q => q.id)).toEqual(Array.from({ length: 39 }, (_, i) => 100 + i));
    expect(avant.exercices[1].questions).toHaveLength(99);
    expect(apres.exercices[0]).toBe(avant.exercices[0]);
    expect(apres.exercices.map(e => e.id)).toEqual([99, QUIZ_LYON_INITIAL_ID]);
  });
  it('aucun ID répété et fusion idempotente', () => {
    const une = fusionnerQuizLyon(module8());
    const ids = une.exercices[1].questions.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(fusionnerQuizLyon(une)).toEqual(une);
  });
  it('chaque ajout : QCM à réponse unique, 4 choix, explication', () => {
    for (const q of QUESTIONS_AJOUT_LYON) {
      expect(q.choix).toHaveLength(4);
      expect(q.choix.filter(c => c.correct)).toHaveLength(1);
      expect(q.explication.length).toBeGreaterThan(10);
    }
  });
  it("n'écrit jamais les ajouts en base lors d'un enregistrement", () => {
    const enregistre = retirerAjoutsQuizLyon(8, fusionnerQuizLyon(module8()));
    expect(enregistre.exercices[1].questions).toEqual(initiales);
  });
  it('ne touche pas aux autres modules', () => {
    const m = { id: 6, exercices: [{ id: QUIZ_LYON_INITIAL_ID, questions: initiales }] };
    expect(fusionnerQuizLyon(m)).toBe(m);
  });
});
