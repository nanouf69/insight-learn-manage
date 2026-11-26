import { describe, expect, it } from 'vitest';
import { ajouterLyonVtc, COURS_LYON_VTC_ID, PDF_LYON_VTC, QCM2_LYON, estQcm2Lyon, estPdfLyonVtc } from '@/lib/pratiqueVtcLyonQcm2';

describe('Ajout complémentaire Lyon VTC', () => {
  it('convertit uniquement les 39 objectifs absents sur les 76 du PDF', () => {
    expect(QCM2_LYON.questions.map(q => q.sourceQuestion)).toEqual([
      1,2,3,4,5,6,7,8,9,11,14,16,19,27,31,33,35,36,40,43,47,53,55,57,58,61,62,63,64,67,68,69,70,71,72,73,74,75,76,
    ]);
    expect(new Set(QCM2_LYON.questions.map(q => q.id)).size).toBe(39);
  });
  it.each(QCM2_LYON.questions)('Q$sourceQuestion : quatre choix et une seule réponse correcte', q => {
    expect(q.choix.map(c => c.lettre)).toEqual(['A', 'B', 'C', 'D']);
    expect(new Set(q.choix.map(c => c.texte)).size).toBe(4);
    expect(q.choix.filter(c => 'correct' in c && c.correct)).toHaveLength(1);
    expect(q.explication.length).toBeGreaterThan(10);
  });
  it('préserve le quiz actuel, les cours, leurs indices et leurs fichiers', () => {
    const oldQuiz = { id: 1785332774763, questions: [{ id: 1, reponse: 'historique' }] };
    const oldCourse = { id: COURS_LYON_VTC_ID, fichiers: [{ nom: 'Original.pptx', url: '/original.pptx' }] };
    const before = { id: 8, cours: [{ id: 1, fichiers: [] }, oldCourse], exercices: [oldQuiz] };
    const after = ajouterLyonVtc(before);
    expect(after.exercices[0]).toBe(oldQuiz);
    expect(after.cours.map(c => c.id)).toEqual([1, COURS_LYON_VTC_ID]);
    expect(after.cours[1].fichiers?.[0]).toBe(oldCourse.fichiers[0]);
    expect(after.cours[1].fichiers?.[1]).toEqual(PDF_LYON_VTC);
    expect(before.cours[1].fichiers).toHaveLength(1);
    expect(ajouterLyonVtc(after)).toEqual(after);
  });
  it('refuse un autre module et un identifiant déjà occupé', () => {
    expect(() => ajouterLyonVtc({ id: 6, cours: [], exercices: [] })).toThrow();
    expect(() => ajouterLyonVtc({ id: 8, cours: [{ id: COURS_LYON_VTC_ID }], exercices: [{ id: QCM2_LYON.id }] })).toThrow();
  });
  it('réserve la sélection unique au nouveau quiz du module 8', () => {
    expect(estQcm2Lyon(8, 826110201)).toBe(true);
    expect(estQcm2Lyon(8, 1785332774763)).toBe(false);
    expect(estQcm2Lyon(6, 826110201)).toBe(false);
  });
  it('autorise le téléchargement uniquement du nouveau PDF exact', () => {
    expect(estPdfLyonVtc(PDF_LYON_VTC.url)).toBe(true);
    expect(estPdfLyonVtc('/ancien-support.pdf')).toBe(false);
  });
});