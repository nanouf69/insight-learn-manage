import { describe, expect, it } from 'vitest';
import { acknowledgedEditorState, isIncompleteCurrencyChoice } from '@/lib/editorSaveAcknowledgement';
import { applyQuestionSaveIntent } from '@/lib/adminQuestionSaveIntent';

const data = (amount: string) => ({ id: 12, exercices: [{ id: 306, questions: [
  { id: 4, choix: [{ lettre: 'A', texte: amount, correct: true }, { lettre: 'B', texte: '2 €' }, { lettre: 'C', texte: 'Pas de surplus' }] },
  { id: 5, choix: [{ lettre: 'A', texte: '12 €', correct: true }] },
] }] });

describe('Acknowledgement of an admin monetary choice', () => {
  it('does not replace 8€ by an older acknowledgement, even when server time is later', () => {
    const latest = data('8€');
    expect(acknowledgedEditorState(latest, data('€'), 1, 2)).toBe(latest);
    expect(acknowledgedEditorState(latest, data('_€'), 1, 3)).toBe(latest);
  });
  it('applies the acknowledgement of the exact captured revision', () => {
    const confirmed = data('8€');
    expect(acknowledgedEditorState(data('2 €'), confirmed, 2, 2)).toBe(confirmed);
  });
  it.each(['8€', '8 euros', '8', '8.00', '8,00', ' 8 € '])('preserves original %s through save intent and JSON readback', amount => {
    const server = data('4 €'); const snapshot = JSON.stringify(server);
    const local = data(amount);
    const readback = JSON.parse(JSON.stringify(applyQuestionSaveIntent(local, server, new Set(['306-4']), new Set(), new Set())));
    expect(readback.exercices[0].questions[0].choix[0].texte).toBe(amount);
    expect(readback.exercices[0].questions[1]).toEqual(server.exercices[0].questions[1]);
    expect(readback.exercices[0].questions[0].choix.slice(1)).toEqual(server.exercices[0].questions[0].choix.slice(1));
    expect(JSON.stringify(server)).toBe(snapshot);
  });
  it.each(['€', ' € ', '_€', 'euros'])('detects incomplete monetary choice %s', value => {
    expect(isIncompleteCurrencyChoice(value)).toBe(true);
  });
  it.each(['8€', '2 €', '80 €', 'Pas de surplus', 'Prix en euros', ''])('does not invent or modify %s', value => {
    expect(isIncompleteCurrencyChoice(value)).toBe(false);
  });
});