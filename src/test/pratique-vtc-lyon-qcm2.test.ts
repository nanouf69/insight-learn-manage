import { describe, expect, it } from 'vitest';
import { QCM2_LYON, noteEntrainementLyon } from '@/lib/pratiqueVtcLyonQcm2';
import { ajouterLyonVtc, COURS_LYON_VTC_ID, PDF_LYON_VTC, estPdfLyonVtc } from '@/lib/pratiqueVtcLyonRessource';

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
  it('refuse un autre module sans inventer un cours', () => {
    expect(() => ajouterLyonVtc({ id: 6, cours: [], exercices: [] })).toThrow();
    expect(() => ajouterLyonVtc({ id: 8, cours: [], exercices: [] })).toThrow();
  });
  it('ne crée aucun exercice requis ni page ou jalon supplémentaire', () => {
    const before = { id: 8, cours: [{ id: COURS_LYON_VTC_ID }], exercices: [{ id: 1785332774763 }] };
    const after = ajouterLyonVtc(before);
    expect(after.exercices).toBe(before.exercices);
    expect(after.exercices.map(e => e.id)).toEqual([1785332774763]);
    expect(after.cours.map(c => c.id)).toEqual(before.cours.map(c => c.id));
  });
  it('calcule uniquement un résultat local avec une seule réponse par question', () => {
    expect(noteEntrainementLyon({})).toBe(0);
    expect(noteEntrainementLyon({ 826110001: 'A' })).toBe(1);
    expect(noteEntrainementLyon({ 826110001: 'B' })).toBe(0);
    expect(noteEntrainementLyon({ 826110001: 'A,B' })).toBe(0);
  });
  it('autorise le téléchargement uniquement du nouveau PDF exact', () => {
    expect(estPdfLyonVtc(PDF_LYON_VTC.url)).toBe(true);
    expect(estPdfLyonVtc('/ancien-support.pdf')).toBe(false);
  });
});