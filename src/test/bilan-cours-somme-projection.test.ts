// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { selectBilanNationalDisplayRows, selectBilanTaxiLocaleRows } from '@/lib/bilanTaxiNationaleSelection';
import { projeterBilanDepuisCours, projeterExerciceBilanDepuisCours, retablirExercicesProjetesDuServeur } from '@/lib/bilanCoursSommeProjection';

// Projection canonique historique encore utilisée avant la composition statique complète.
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

describe('projection canonique locale existante', () => {
  it('conserve 105 lignes canoniques avant la projection statique finale', () => {
    expect(rowsLocale.filter(row => row.quiz_id === 'bilan-exercices-taxi' && row.section_id === 204)).toHaveLength(242);
    expect(localeAffichee()).toHaveLength(105);
    expect(new Set(localeAffichee().map(row => row.question_id)).size).toBe(105);
  });
  it('respecte l’ordre canonique 73, 76, 74, 75', () => {
    const attendu = SECTIONS_LOCALES.flatMap(([section, total]) =>
      Array.from({ length: total }, (_, i) => section * 1000 + i + 1));
    expect(localeAffichee().map(row => row.legacy_question_id)).toEqual(attendu);
  });
  it('préserve les identités et refuse une source canonique incohérente', () => {
    expect(localeAffichee()[0].question_id).toBe('bilan-73-1');
    expect(() => selectBilanTaxiLocaleRows(9, rowsLocale.filter(row => row.question_id !== 'source-73-1'))).toThrow();
    expect(() => selectBilanTaxiLocaleRows(9, [...rowsLocale, sourceLocale[0]])).toThrow();
    expect(selectBilanNationalDisplayRows(27, rowsLocale)).toBeDefined();
    expect(selectBilanTaxiLocaleRows(2, rowsLocale)).toBe(rowsLocale);
  });
});

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
const exerciceNonConfigure = { id: 999999, questions: [{ id: 1, enonce: 'Intact' }] };

describe('projection T3P et Gestion', () => {
  it('T3P suit exactement les sources fournies et Gestion n’est plus une exception', () => {
    const projete = projeterBilanDepuisCours(9, [bilanT3P, bilanGestion, exerciceNonConfigure] as any, coursComplet as any);
    expect(projete.find(e => e.id === 100)!.questions).toHaveLength(133);
    expect(projete.find(e => e.id === 101)!.questions).toHaveLength(150);
    expect(projete.find(e => e.id === 100)!.questions![53].enonce).toBe('T3P P2 Q1');
    expect(projete.find(e => e.id === 999999)).toBe(exerciceNonConfigure);
  });
  it('préserve les identités historiques et exclut les suppléments sans les effacer', () => {
    const avant = JSON.stringify([bilanT3P, bilanGestion]);
    const projete = projeterBilanDepuisCours(9, [bilanT3P, bilanGestion] as any, coursComplet as any);
    expect(projete[0].questions![0].id).toBe(2001);
    expect(projete[0].questions!.some(q => String(q.enonce).startsWith('Ancienne question bilan'))).toBe(false);
    expect(projete[1].questions!.some(q => String(q.enonce).startsWith('Ancienne gestion'))).toBe(false);
    expect(JSON.stringify([bilanT3P, bilanGestion])).toBe(avant);
  });
  it('attribue un ID déterministe source/exercice/question à une question sans historique', () => {
    const coursAvecNouvelle = [{ id: 1, questions: [...coursT3P[0].questions, { id: 99, enonce: 'Nouvelle question cours' }] }, coursT3P[1]];
    const projete = projeterBilanDepuisCours(9, [bilanT3P] as any, coursAvecNouvelle as any);
    const nouvelle = projete[0].questions!.find(q => q.enonce === 'Nouvelle question cours')!;
    expect(nouvelle.id).toBe(901099);
    expect(nouvelle.source_exercice_id).toBe(1);
    expect(nouvelle.source_question_id).toBe(99);
  });
  it('refuse une source absente ou vide plutôt que fabriquer un vide', () => {
    expect(() => projeterBilanDepuisCours(9, [bilanT3P] as any, [] as any)).toThrow();
    expect(() => projeterExerciceBilanDepuisCours(bilanT3P as any, [{ id: 1, questions: [] }] as any)).toThrow();
  });
  it('l’enregistrement rétablit toutes les questions serveur projetées', () => {
    const projete = projeterBilanDepuisCours(9, [bilanT3P, bilanGestion, exerciceNonConfigure] as any, coursComplet as any);
    const restaure = retablirExercicesProjetesDuServeur(9, projete as any, [bilanT3P, bilanGestion, exerciceNonConfigure] as any);
    expect(restaure.find(e => e.id === 100)!.questions).toBe(bilanT3P.questions);
    expect(restaure.find(e => e.id === 101)!.questions).toBe(bilanGestion.questions);
    expect(restaure.find(e => e.id === 999999)).toBe(exerciceNonConfigure);
  });
});
