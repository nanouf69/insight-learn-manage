// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { canonicalQuizIdsForDisplay, selectBilanTaxiNationaleRows, preserveTaxiNationalSnapshot, canonicalQuizIdsForNationalDisplay, selectBilanNationalDisplayRows } from '@/lib/bilanTaxiNationaleSelection';

const source = [70, 71].flatMap(section => Array.from({ length: section === 70 ? 64 : 34 }, (_, i) => {
  const id = section === 71 && i >= 14 ? i + 2 : i + 1;
  return { question_id: `source-${section}-${id}`, quiz_id: 'reglementation-nationale', section_id: section,
    legacy_question_id: id, position: i + 1, active: true,
    enonce: section === 71 && id === 7 ? 'TICPE 30,55 €' : 'Question actuelle',
    choix: [{ lettre: 'A', texte: section === 71 && id === 10 ? 'DGFIP' : 'Actuel', correct: true }] };
}));
const bilan = source.map(row => ({ ...row, question_id: `bilan-${row.section_id}-${row.legacy_question_id}`,
  quiz_id: 'bilan-exercices-taxi', section_id: 203, legacy_question_id: row.section_id * 1000 + row.legacy_question_id,
  enonce: 'Ancienne version', choix: [{ lettre: 'A', texte: 'Ancien', correct: false }] }));
const removed = { ...source[0], question_id: 'retired', section_id: 71, legacy_question_id: 15, active: false };
const extras = Array.from({ length: 97 }, (_, i) => ({ ...bilan[0], question_id: `extra-${i}`, legacy_question_id: i + 1 }));
const other = { ...bilan[0], section_id: 204, question_id: 'local' };
const rows = [...bilan, ...extras, other, removed, ...source].reverse();
const national = () => selectBilanTaxiNationaleRows(9, rows).filter(row => row.quiz_id === 'bilan-exercices-taxi' && row.section_id === 203);

describe('sélection nationale TAXI seule', () => {
  it('reproduit 195 entrées puis affiche exactement 98 uniques', () => {
    expect(rows.filter(row => row.quiz_id === 'bilan-exercices-taxi' && row.section_id === 203)).toHaveLength(195);
    expect(national()).toHaveLength(98);
    expect(new Set(national().map(row => row.question_id)).size).toBe(98);
    expect(new Set(national().map(row => row.legacy_question_id)).size).toBe(98);
  });
  it('garde 64 Partie 1 puis 34 Partie 2 dans leur ordre', () => {
    expect(national().slice(0,64).map(row => row.legacy_question_id)).toEqual(source.slice(0,64).map(row => 70000 + row.legacy_question_id));
    expect(national().slice(64).map(row => row.legacy_question_id)).toEqual(source.slice(64).map(row => 71000 + row.legacy_question_id));
  });
  it('exclut la question 15 retirée', () => expect(national().some(row => row.legacy_question_id === 71015)).toBe(false));
  it('utilise la version actuelle de la question 7 et son corrigé', () => {
    const question = national().find(row => row.legacy_question_id === 71007);
    expect(question?.enonce).toBe('TICPE 30,55 €');
    expect(question?.choix).toEqual(source.find(row => row.section_id === 71 && row.legacy_question_id === 7)?.choix);
  });
  it('utilise la version actuelle de la question 10', () => expect(national().find(row => row.legacy_question_id === 71010)?.choix[0].texte).toBe('DGFIP'));
  it('préserve les identités Bilan existantes et ne mute aucune source', () => {
    const before = JSON.stringify(rows); national();
    expect(JSON.stringify(rows)).toBe(before);
    expect(national()[0].question_id).toBe(bilan[0].question_id);
  });
  it('laisse TA strictement inchangé, y compris les doublons historiques', () => {
    expect(selectBilanTaxiNationaleRows(27, rows)).toBe(rows);
    expect(canonicalQuizIdsForDisplay(27, ['bilan-exercices-taxi'])).toEqual(['bilan-exercices-taxi']);
  });
  it('laisse la matière locale inchangée', () => expect(selectBilanTaxiNationaleRows(9,rows).find(row => row.question_id === 'local')).toBe(other));
  it('refuse une lecture incomplète sans fallback', () => expect(() => selectBilanTaxiNationaleRows(9,rows.filter(row => row.question_id !== source[0].question_id))).toThrow());
  it('refuse un doublon dans la source canonique', () => expect(() => selectBilanTaxiNationaleRows(9,[...rows,source[0]])).toThrow());
  it('refuse une identité Bilan absente plutôt que renuméroter', () => expect(() => selectBilanTaxiNationaleRows(9,rows.filter(row => row.question_id !== bilan[0].question_id))).toThrow());
  it('garde exclusivement les snapshots historiques TAXI nationale sans actualiser leurs corrigés', () => {
    expect(preserveTaxiNationalSnapshot(9,203)).toBe(true);
    expect(preserveTaxiNationalSnapshot(27,250)).toBe(false);
    expect(preserveTaxiNationalSnapshot(9,204)).toBe(false);
  });
});

describe('affichage national TA exclusivement, sans modifier les chemins TAXI/enregistrement', () => {
  const taNational = () => selectBilanNationalDisplayRows(27, rows).filter(row => row.quiz_id === 'bilan-exercices-taxi' && row.section_id === 203);
  it('TA affiche les mêmes 98 identités uniques, 64 Partie 1 puis 34 Partie 2 actuelles que TAXI', () => {
    expect(taNational()).toHaveLength(98);
    expect(new Set(taNational().map(row => row.question_id)).size).toBe(98);
    expect(taNational()).toEqual(national());
    expect(taNational().slice(0, 64).map(row => row.legacy_question_id)).toEqual(source.slice(0,64).map(row => 70000 + row.legacy_question_id));
    expect(taNational().slice(64).map(row => row.legacy_question_id)).toEqual(source.slice(64).map(row => 71000 + row.legacy_question_id));
    expect(taNational().some(row => row.legacy_question_id === 71015)).toBe(false);
    expect(taNational().find(row => row.legacy_question_id === 71007)?.enonce).toBe('TICPE 30,55 €');
    expect(taNational().find(row => row.legacy_question_id === 71010)?.choix[0].texte).toBe('DGFIP');
  });
  it('lit la source actuelle sans la liste TA ancienne non rattachée', () => {
    expect(canonicalQuizIdsForNationalDisplay(27, ['bilan-exercices-taxi'])).toEqual(['bilan-exercices-taxi', 'reglementation-nationale']);
    expect(canonicalQuizIdsForDisplay(27, ['bilan-exercices-taxi'])).toEqual(['bilan-exercices-taxi']);
    expect(selectBilanTaxiNationaleRows(27, rows)).toBe(rows);
  });
  it('laisse toutes les lignes hors section nationale identiques, sans mutation', () => {
    const before = JSON.stringify(rows);
    const selected = selectBilanNationalDisplayRows(27, rows);
    const outside = rows.filter(row => !(row.quiz_id === 'bilan-exercices-taxi' && row.section_id === 203));
    expect(selected.slice(0, outside.length)).toEqual(outside);
    outside.forEach((row, index) => expect(selected[index]).toBe(row));
    expect(JSON.stringify(rows)).toBe(before);
  });
  it('ne change aucun autre module, y compris le correctif TAXI', () => {
    for (let moduleId = 1; moduleId <= 100; moduleId++) {
      if (moduleId === 27) continue;
      expect(selectBilanNationalDisplayRows(moduleId, rows)).toEqual(selectBilanTaxiNationaleRows(moduleId, rows));
      expect(canonicalQuizIdsForNationalDisplay(moduleId, ['bilan-exercices-taxi'])).toEqual(canonicalQuizIdsForDisplay(moduleId, ['bilan-exercices-taxi']));
    }
  });
  it('refuse une source incomplète ou une identité absente, sans fabrication', () => {
    expect(() => selectBilanNationalDisplayRows(27, rows.filter(row => row.question_id !== source[0].question_id))).toThrow();
    expect(() => selectBilanNationalDisplayRows(27, [...rows, source[0]])).toThrow();
    expect(() => selectBilanNationalDisplayRows(27, rows.filter(row => row.question_id !== bilan[0].question_id))).toThrow();
  });
});