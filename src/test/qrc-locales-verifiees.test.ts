import { describe, it, expect } from 'vitest';
import { QCM_LOCAUX_BILAN_TA } from '@/data/bilan-ta/qcmLocauxBilanTa';
import { reponsesLocalesAcceptees } from '@/lib/quizQrcTaxi/correctionsLocalesVerifiees';

describe('Corrections facultatives documentées Q29/Q35', () => {
  it('Q35 accepte D et refuse les seuils trois, quatre et cinq places', () => {
    const q = QCM_LOCAUX_BILAN_TA.find(q => q.id === 35);
    if (!q) throw new Error('Q35 absente');
    expect(reponsesLocalesAcceptees(q)).toEqual(['D']);
    for (const letter of ['A', 'B', 'C']) expect(reponsesLocalesAcceptees(q)).not.toContain(letter);
    expect(q.choix.find(c => c.lettre === 'C')?.correct).toBe(true);
    expect(q.choix.find(c => c.lettre === 'D')?.correct).toBe(false);
  });
  it('Q29 ne déduit pas un lieu de dépose du client absent de l’énoncé', () => {
    const q = QCM_LOCAUX_BILAN_TA.find(q => q.id === 29);
    if (!q) throw new Error('Q29 absente');
    expect(reponsesLocalesAcceptees(q)).toEqual(['A']);
  });
  it('toutes les autres clés sont exactement celles de la copie TA', () => {
    for (const q of QCM_LOCAUX_BILAN_TA.filter(q => q.id !== 35)) {
      expect(reponsesLocalesAcceptees(q)).toEqual(q.choix.filter(c => c.correct).map(c => c.lettre));
    }
  });
  it('un énoncé ou choix différent ne reçoit jamais l’exception Q35', () => {
    const q = QCM_LOCAUX_BILAN_TA.find(q => q.id === 35);
    if (!q) throw new Error('Q35 absente');
    expect(reponsesLocalesAcceptees({ ...q, enonce: 'Une autre question' })).toEqual(['C']);
  });
});