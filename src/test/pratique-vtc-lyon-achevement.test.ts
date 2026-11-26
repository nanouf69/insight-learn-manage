import { describe, expect, it } from 'vitest';
import { seuilQuizLyon, reponsesQuizLyonCompletes } from '@/lib/pratiqueVtcLyonAchevement';
import { QUIZ_LYON_INITIAL_ID } from '@/lib/pratiqueVtcLyonFusion';

const answers = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${QUIZ_LYON_INITIAL_ID}-${i + 1}`, ['A']]));

describe('achèvement du quiz initial Lyon, sans nouveau jalon', () => {
  it('cohorte historique : 99 réponses terminent, sans altérer les preuves', () => {
    const original = answers(99); const before = JSON.stringify(original);
    expect(seuilQuizLyon('initiale')).toBe(99);
    expect(reponsesQuizLyonCompletes('initiale', original)).toBe(true);
    expect(JSON.stringify(original)).toBe(before);
  });
  it('cohorte nouvelle : 99 ne terminent pas, 138 exigées', () => {
    expect(seuilQuizLyon('enrichie')).toBe(138);
    expect(reponsesQuizLyonCompletes('enrichie', answers(99))).toBe(false);
    expect(reponsesQuizLyonCompletes('enrichie', answers(137))).toBe(false);
    expect(reponsesQuizLyonCompletes('enrichie', answers(138))).toBe(true);
  });
  it('un trou ne peut pas être remplacé par une réponse hors quiz', () => {
    const a = answers(138); a[`${QUIZ_LYON_INITIAL_ID}-100`] = [];
    a['autre-100'] = ['A'];
    expect(reponsesQuizLyonCompletes('enrichie', a)).toBe(false);
  });
});