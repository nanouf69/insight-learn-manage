// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { nativeResultMatchesAnswers, nativeSnapshotSupportsResult } from '@/lib/nativeExamResultIdentity';
const core = { matiereId: 't3p', questions: [{ id: 't3p:1', type: 'QRC', enonce: 'Frozen', points: 2 }], answers: { 't3p:1': 'answer' }, qrcProofs: [{ questionId: 't3p:1', reponse: 'answer', etat: 'corrigee', note: 0 }] };
describe('Identité native sans dates ni questions courantes', () => {
  it('une correction à zéro est une correction', () => expect(nativeResultMatchesAnswers(core, { reponses: { 1: 'answer' } })).toBe(true));
  it('une réponse différente refuse le rapprochement', () => expect(nativeResultMatchesAnswers(core, { reponses: { 1: 'other' } })).toBe(false));
  it('un identifiant supplémentaire refuse le rapprochement', () => expect(nativeResultMatchesAnswers(core, { reponses: { 1: 'answer', 2: 'foreign' } })).toBe(false));
  it('une QRC absente ou dupliquée refuse le rapprochement', () => {
    expect(nativeResultMatchesAnswers({ ...core, qrcProofs: [] }, { reponses: { 1: 'answer' } })).toBe(false);
    expect(nativeResultMatchesAnswers({ ...core, qrcProofs: [...core.qrcProofs, ...core.qrcProofs] }, { reponses: { 1: 'answer' } })).toBe(false);
  });
  it('un snapshot incomplet reste non fiable', () => {
    expect(nativeSnapshotSupportsResult(core.questions)).toBe(true);
    expect(nativeSnapshotSupportsResult([{ ...core.questions[0], points: null }])).toBe(false);
  });
});