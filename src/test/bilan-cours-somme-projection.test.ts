// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { selectBilanNationalDisplayRows, selectBilanTaxiLocaleRows } from '@/lib/bilanTaxiNationaleSelection';
import { projeterBilanDepuisCours, projeterExerciceBilanDepuisCours, retablirExercicesProjetesDuServeur } from '@/lib/bilanCoursSommeProjection';

// --- Réglementation locale : 73 (29) + 76 (29) + 74 (22) + 75 (25) = 105 ---
const SECTIONS_LOCALES: Array<[number, number]> = [[73, 29], [76, 29], [74, 22], [75, 25]];
const sourceLocale = SECTIONS_LOCALES.flatMap(([section, total]) =>
  Array.from({ length: total }, (_, i) => ({
    question_id: `source-${section}-${i + 1}`, quiz_id: 'reglementation-locale', section_id: section,
    legacy_question_id: i + 1, position: i + 1, active: true,
    enonce: `Question locale ${section}-${i + 1}`, choix: [{ lettre: 'A', texte: 'Actuel', correct: true }],
  })));
const bilanLocale = sourceLocale.map(row => ({
  ...row, question_id: `bilan-${row.section_id}-${row.legacy_question_id}`,
  quiz_id: 'bilan-exercices-taxi', section_id: 204, legacy_question_id: row.section_id * 1000 + row.legacy_question_id,
  enonce: 'Ancienne version locale', choix: [{ lettre: 'A', texte: 'Ancien', correct: false }],
}));
const doublonsHistoriques = Array.from({ length: 137 }, (_, i) => ({
  ...bilanLocale[0], question_id: `doublon-${i}`, legacy_question_id: i + 1,
}));
const inactiveLocale = { ...sourceLocale[0], question_id: 'retired-local', active: false, legacy_question_id: 99 };
const rowsLocale = [...bilanLocale, ...doublonsHistoriques, inactiveLocale, ...sourceLocale].reverse();
const localeAffichee = () => selectBilanTaxiLocaleRows(9, rowsLocale)
  .filter(row => row.quiz_id === 'bilan-exercices-taxi' && row.section_id === 204);

describe('bilan locale = somme des quatre sections du cours', () => {
  it('remplace 242 entrées historiques par exactement 105 uniques', () => {
    expect(rowsLocale.filter(row => row.quiz_id === 'bilan-exercices-taxi' && row.section_id === 204)).toHaveLength(242);
    expect(localeAffichee()).toHaveLength(105);
    expect(new Set(localeAffichee().map(row => row.question_id)).size).toBe(105);
    expect(new Set(localeAffichee().map(row => row.legacy_question_id)).size).toBe(105);
  });
  it('respecte l’ordre 73 puis 76 puis 74 puis 75 et les effectifs 29 + 29 + 22 + 25', () => {
    const attendu = SECTIONS_LOCALES.flatMap(([section, total]) =>
      Array.from({ length: total }, (_, i) => section * 1000 + i + 1));
    expect(localeAffichee().map(row => row.legacy_question_id)).toEqual(attendu);
  });
  it('utilise le contenu actuel du cours et préserve les identités historiques', () => {
    const premiere = localeAffichee()[0];
    expect(premiere.enonce).toBe('Question locale 73-1');
    expect(premiere.question_id).toBe('bilan-73-1');
    const avant = JSON.stringify(rowsLocale);
    localeAffichee();
    expect(JSON.stringify(rowsLocale)).toBe(avant);
  });
  it('refuse une source incomplète ou un doublon plutôt que fabriquer un affichage', () => {
    expect(() => selectBilanTaxiLocaleRows(9, rowsLocale.filter(row => row.question_id !== 'source-73-1'))).toThrow();
    expect(() => selectBilanTaxiLocaleRows(9, [...rowsLocale, sourceLocale[0]])).toThrow();
    expect(() => selectBilanTaxiLocaleRows(9, rowsLocale.filter(row => row.question_id !== 'bilan-73-1'))).toThrow();
  });
  it('TA (module 27) affiche les mêmes 105 via le wrapper, sans toucher les autres modules', () => {
    const ta = selectBilanNationalDisplayRows(27, rowsLocale)
      .filter(row => row.quiz_id === 'bilan-exercices-taxi' && row.section_id === 204);
    expect(ta).toEqual(localeAffichee());
    expect(selectBilanTaxiLocaleRows(27, rowsLocale)).toBe(rowsLocale);
    expect(selectBilanTaxiLocaleRows(2, rowsLocale)).toBe(rowsLocale);
  });
});

// --- T3P / Gestion : projection JSON depuis le module cours 10 ---
const coursT3P = [
  { id: 1, questions: Array.from({ length: 53 }, (_, i) => ({ id: i + 1, enonce: `T3P P1 Q${i + 1}`, choix: [{ lettre: 'A', texte: 'x', correct: true }] })) },
  { id: 2, questions: Array.from({ length: 80 }, (_, i) => ({ id: i + 1, enonce: `T3P P2 Q${i + 1}`, choix: [{ lettre: 'A', texte: 'x', correct: true }] })) },
];
const coursGestion = [
  { id: 60, questions: Array.from({ length: 45 }, (_, i) => ({ id: i + 1, enonce: `Gestion P1 Q${i + 1}` })) },
  { id: 61, questions: Array.from({ length: 59 }, (_, i) => ({ id: i + 1, enonce: `Gestion P2 Q${i + 1}` })) },
  { id: 62, questions: Array.from({ length: 46 }, (_, i) => ({ id: i + 1, enonce: `Gestion P3 Q${i + 1}` })) },
];
const coursComplet = [...coursT3P, ...coursGestion];
// Bilan historique : 206 T3P (133 rattachées + 73 sans source) et 171 Gestion.
const bilanT3P = {
  id: 100,
  questions: [
    ...coursT3P.flatMap(exo => exo.questions.map(q => ({
      id: 1000 + Number(exo.id) * 1000 + q.id, enonce: `Ancien — ${q.enonce}`,
      source_exercice_id: exo.id, source_question_id: q.id,
    }))),
    ...Array.from({ length: 73 }, (_, i) => ({ id: 5000 + i, enonce: `Ancienne question bilan ${i + 1}` })),
  ],
};
const bilanGestion = {
  id: 101,
  questions: [
    ...coursGestion.flatMap(exo => exo.questions.map(q => ({
      id: 60000 + Number(exo.id) * 100 + q.id, enonce: `Ancien — ${q.enonce}`,
      source_exercice_id: exo.id, source_question_id: q.id,
    }))),
    ...Array.from({ length: 21 }, (_, i) => ({ id: 8000 + i, enonce: `Ancienne gestion ${i + 1}` })),
  ],
};
const bilanAutre = { id: 102, questions: [{ id: 1, enonce: 'Sécurité intacte' }] };

describe('bilan T3P/Gestion = somme exacte des questions du cours', () => {
  it('T3P affiche exactement 53 + 80 = 133 questions du cours, dans l’ordre', () => {
    const projete = projeterBilanDepuisCours(9, [bilanT3P, bilanGestion, bilanAutre] as any, coursComplet as any);
    const t3p = projete.find(e => e.id === 100)!;
    expect(t3p.questions).toHaveLength(133);
    expect(t3p.questions![0].enonce).toBe('T3P P1 Q1');
    expect(t3p.questions![52].enonce).toBe('T3P P1 Q53');
    expect(t3p.questions![53].enonce).toBe('T3P P2 Q1');
    expect(new Set(t3p.questions!.map(q => q.id)).size).toBe(133);
  });
  it('Gestion affiche exactement 45 + 59 + 46 = 150 questions du cours', () => {
    const projete = projeterBilanDepuisCours(9, [bilanT3P, bilanGestion, bilanAutre] as any, coursComplet as any);
    const gestion = projete.find(e => e.id === 101)!;
    expect(gestion.questions).toHaveLength(150);
    expect(new Set(gestion.questions!.map(q => q.id)).size).toBe(150);
  });
  it('préserve les identités historiques pour les questions déjà rattachées', () => {
    const projete = projeterBilanDepuisCours(9, [bilanT3P] as any, coursT3P as any);
    const t3p = projete[0];
    expect(t3p.questions![0].id).toBe(1000 + 1000 + 1); // identité historique conservée
    expect(t3p.questions![0].enonce).toBe('T3P P1 Q1'); // contenu actuel du cours
  });
  it('n’affiche plus les 73 questions historiques absentes du cours, sans les supprimer', () => {
    const avant = JSON.stringify(bilanT3P);
    const projete = projeterBilanDepuisCours(9, [bilanT3P] as any, coursT3P as any);
    expect(projete[0].questions!.some(q => String(q.enonce).startsWith('Ancienne question bilan'))).toBe(false);
    expect(JSON.stringify(bilanT3P)).toBe(avant); // aucune mutation de la source
    expect(bilanT3P.questions).toHaveLength(206); // historique intact en base
  });
  it('attribue un identifiant d’affichage déterministe à une question du cours sans historique', () => {
    const coursAvecNouvelle = [{ id: 1, questions: [...coursT3P[0].questions, { id: 99, enonce: 'Nouvelle question cours' }] }, coursT3P[1]];
    const projete = projeterBilanDepuisCours(9, [bilanT3P] as any, coursAvecNouvelle as any);
    const nouvelle = projete[0].questions!.find(q => q.enonce === 'Nouvelle question cours')!;
    expect(nouvelle.id).toBeGreaterThanOrEqual(900000);
    expect(nouvelle.source_exercice_id).toBe(1);
    expect(nouvelle.source_question_id).toBe(99);
  });
  it('ne touche ni les autres exercices du bilan, ni les autres modules', () => {
    const projete = projeterBilanDepuisCours(9, [bilanT3P, bilanAutre] as any, coursComplet as any);
    expect(projete.find(e => e.id === 102)).toBe(bilanAutre);
    const autreModule = [{ id: 100, questions: [{ id: 1, enonce: 'VTC intact' }] }];
    expect(projeterBilanDepuisCours(3, autreModule as any, coursComplet as any)).toBe(autreModule);
  });
  it('refuse une source absente ou vide plutôt que fabriquer un vide', () => {
    expect(() => projeterBilanDepuisCours(9, [bilanT3P] as any, [] as any)).toThrow();
    expect(() => projeterExerciceBilanDepuisCours(bilanT3P as any, [{ id: 1, questions: [] }] as any)).toThrow();
  });
  it('l’enregistrement rétablit exactement la version serveur des exercices projetés', () => {
    const projete = projeterBilanDepuisCours(9, [bilanT3P, bilanGestion, bilanAutre] as any, coursComplet as any);
    const serveur = [bilanT3P, bilanGestion, bilanAutre];
    const restaure = retablirExercicesProjetesDuServeur(9, projete as any, serveur as any);
    expect(restaure.find(e => e.id === 100)!.questions).toBe(bilanT3P.questions);
    expect(restaure.find(e => e.id === 101)!.questions).toBe(bilanGestion.questions);
    expect(restaure.find(e => e.id === 102)).toBe(bilanAutre);
    expect(retablirExercicesProjetesDuServeur(3, projete as any, serveur as any)).toBe(projete);
  });
});
