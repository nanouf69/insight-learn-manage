import { describe, it, expect } from 'vitest';
import { applyQuestionSaveIntent, isCanonicalQuestionSaveIntent } from '@/lib/adminQuestionSaveIntent';

const question = (id: number) => ({ id, enonce: `Question ${id}`, explication: 'Explication conservée', choix: [{ lettre: 'D', texte: '1,30 €', correct: false }], image: 'image-originale' });
const server = () => ({ id: 10, exercices: [{ id: 70, questions: Array.from({ length: 64 }, (_, i) => question(i + 1)) }, { id: 71, questions: Array.from({ length: 35 }, (_, i) => question(i + 1)) }, { id: 74, questions: Array.from({ length: 27 }, (_, i) => question(i + 1)) }] });
const none = new Set<string>();
const keys = (data: ReturnType<typeof server>) => data.exercices.flatMap(e => e.questions.map(q => `${e.id}:${q.id}`));

describe('Admin : lot complet + intentions par identifiant, jamais par omission', () => {
  it('reproduit exactement les sept retraits historiques 73:6, 74:14/15/16/18/19, 76:28 sans les rejouer', () => {
    const original = { exercices: [{ id: 73, questions: [question(6), question(7)] }, { id: 74, questions: [14,15,16,18,19,21].map(question) }, { id: 76, questions: [question(28), question(29)] }] };
    const tombstones: Record<number, number[]> = { 73: [6], 74: [14,15,16,18,19,20,24], 76: [28] };
    const local = { exercices: original.exercices.map(e => ({ ...e, deletedQuestionIds: tombstones[e.id], questions: e.questions.filter(q => !tombstones[e.id].includes(q.id)) })) };
    const legacyRemoved = original.exercices.flatMap(e => e.questions.filter(q => !local.exercices.find(x => x.id === e.id)?.questions.some(x => x.id === q.id) && tombstones[e.id].includes(q.id)).map(q => `${e.id}:${q.id}`));
    expect(legacyRemoved).toEqual(['73:6','74:14','74:15','74:16','74:18','74:19','76:28']);
    const result = applyQuestionSaveIntent(local, original, new Set(['71-10']), none, none);
    expect(result.exercices.map(e => e.questions)).toEqual(original.exercices.map(e => e.questions));
  });
  it('avant : projection 34 + 21 questions entraîne sept retraits ; après : zéro retrait pour une réponse', () => {
    const original = server();
    const local = structuredClone(original);
    local.exercices[1].questions = local.exercices[1].questions.filter(q => q.id !== 15);
    local.exercices[2].questions = local.exercices[2].questions.slice(0, 21);
    const edited = local.exercices[1].questions.find(q => q.id === 10);
    if (!edited) throw new Error('Question attendue');
    edited.choix[0].correct = true;
    expect(keys(original).filter(k => !keys(local).includes(k))).toHaveLength(7);
    const result = applyQuestionSaveIntent(local, original, new Set(['71-10']), none, none);
    expect(keys(result)).toEqual(keys(original));
    expect(result.exercices[1].questions.find(q => q.id === 10)?.choix[0].correct).toBe(true);
    expect(result.exercices[0]).toEqual(original.exercices[0]);
    expect(result.exercices[2].questions).toEqual(original.exercices[2].questions);
  });
  it('sauvegarde/relecture JSON et réouverture conservent choix, texte, explication et ID sans modifier les autres', () => {
    const original = server(); const frozen = structuredClone(original); const local = structuredClone(original);
    const q = local.exercices[1].questions[3];
    q.choix[0] = { lettre: 'D', texte: '1,30 €', correct: true }; q.explication = 'Corrigé pédagogique modifié';
    const result = applyQuestionSaveIntent(local, original, new Set(['71-4']), none, none);
    const readback = JSON.parse(JSON.stringify(result)) as typeof original;
    expect(readback.exercices[1].questions[3]).toEqual(q);
    readback.exercices.forEach(e => e.questions.forEach(saved => { if (e.id !== 71 || saved.id !== 4) expect(saved).toEqual(frozen.exercices.find(x => x.id === e.id)?.questions.find(x => x.id === saved.id)); }));
    expect(original).toEqual(frozen);
    expect(applyQuestionSaveIntent(readback, readback, none, none, none)).toEqual(readback);
  });
  it('les anciens marqueurs supprimés ne deviennent pas des commandes de suppression', () => {
    const original = server(); const local = structuredClone(original);
    const e = local.exercices[1] as typeof local.exercices[1] & { deletedQuestionIds: number[] };
    e.deletedQuestionIds = [15, 16, 17, 18, 19, 20, 21];
    e.questions = e.questions.filter(q => !e.deletedQuestionIds.includes(q.id));
    expect(keys(applyQuestionSaveIntent(local, original, none, none, none))).toEqual(keys(original));
  });
  it('seul un identifiant explicitement supprimé dans cet éditeur est retiré', () => {
    const original = server(); const local = structuredClone(original);
    local.exercices[1].questions = local.exercices[1].questions.filter(q => q.id !== 15 && q.id !== 16);
    const result = applyQuestionSaveIntent(local, original, none, none, new Set(['71-15']));
    expect(keys(original).filter(k => !keys(result).includes(k))).toEqual(['71:15']);
  });
  it('lecture absente : aucune sauvegarde partielle', () => {
    expect(() => applyQuestionSaveIntent(server(), null, none, none, none)).toThrow('aucune sauvegarde');
  });
  it('ligne JSON historique invisible : aucune republication canonique implicite', () => {
    expect(isCanonicalQuestionSaveIntent(71, 15, new Set(['71-10']), none)).toBe(false);
    expect(isCanonicalQuestionSaveIntent(71, 10, new Set(['71-10']), none)).toBe(true);
    expect(isCanonicalQuestionSaveIntent(70, 10, new Set(['71-10']), none)).toBe(false);
  });
  it('une question inconnue non ajoutée explicitement ne rentre pas dans le lot', () => {
    const original = server(); const local = structuredClone(original); local.exercices[1].questions.push(question(999));
    expect(keys(applyQuestionSaveIntent(local, original, new Set(['71-999']), none, none))).toEqual(keys(original));
  });
});