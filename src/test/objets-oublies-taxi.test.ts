import { describe, expect, it } from 'vitest';
import { CONTROLE_CONNAISSANCES_TAXI_DATA } from '@/components/cours-en-ligne/controle-connaissances-taxi-data';
import { QCM_LOCAUX_BILAN_TA } from '@/data/bilan-ta/qcmLocauxBilanTa';
import { feedbackLocalVerifie, reponsesLocalesAcceptees } from '@/lib/quizQrcTaxi/correctionsLocalesVerifiees';

describe('Objets oubliés : délai et non-rétroactivité des clés', () => {
  it('le choix correct du contrôle Givors porte 72 heures, jamais 24', () => {
    const q = CONTROLE_CONNAISSANCES_TAXI_DATA.exercices.flatMap(e => e.questions ?? []).find(q => q.id === 57);
    if (!q) throw new Error('Givors absent');
    expect(q.choix.filter(c => c.correct)).toEqual([{ lettre: 'A', texte: "Aux services des objets trouvés de la mairie de dépose ou auprès de l'autorité de délivrance de l'ADS dans un délai maximum de 72 heures", correct: true }]);
    expect(q.enonce).toBe('Un client a oublié un objet dans le véhicule taxi après une dépose sur Givors. Où le déposer ?');
  });
  it('les deux sujets objets conservent leurs lettres historiques, sans mutation de la copie', () => {
    const before = JSON.stringify(QCM_LOCAUX_BILAN_TA);
    for (const [id, letter] of [[20, 'B'], [29, 'A']] as const) {
      const q = QCM_LOCAUX_BILAN_TA.find(q => q.id === id);
      if (!q) throw new Error('Question absente');
      expect(reponsesLocalesAcceptees(q)).toEqual([letter]);
      feedbackLocalVerifie(q);
    }
    expect(JSON.stringify(QCM_LOCAUX_BILAN_TA)).toBe(before);
  });
});