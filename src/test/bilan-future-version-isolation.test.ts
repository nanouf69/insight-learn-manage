// @vitest-environment node
import { describe, expect, it } from 'vitest';
import source from './fixtures/bilan-common-source-20261029.json';
import { freezeBilanFutureCandidate, prepareBilanFutureBank, selectBilanFutureRoute, type BilanSource } from '@/lib/bilanFutureVersion';

const bank = () => prepareBilanFutureBank(source as BilanSource);
const key = (subject: number, id: number) => bank()[subject].questions.find(q => q.id === id)?.choix.filter(c => c.correct).map(c => c.lettre);
const context = { ownerId: 'technical-A', moduleId: 5, exerciseId: 500, receipt: null, receiptReadFailed: false };

describe('Isolated future Bilan preparation, never legacy mutations', () => {
  it('preserves both complete legacy banks byte for byte', () => {
    const before = JSON.stringify(source); bank(); expect(JSON.stringify(source)).toBe(before);
  });
  it('keeps any old copy without receipt on its exact legacy circuit', () => {
    for (const [moduleId, exerciseId] of [[5, 500], [11, 600], [11, 604]])
      expect(selectBilanFutureRoute({ ...context, moduleId, exerciseId })).toBe('legacy');
  });
  it('does not change an old snapshot when preparing a new candidate', () => {
    const old = structuredClone((source as BilanSource)[0].exercices[0].questions);
    const before = JSON.stringify(old); freezeBilanFutureCandidate(bank()[0].questions);
    expect(JSON.stringify(old)).toBe(before);
  });
  it('uses approved Q104 B without the corrupt admin fragments', () => {
    expect(key(0, 104)).toEqual(['B']);
    expect(bank()[0].questions.find(q => q.id === 104)?.choix.map(c => c.texte)).toEqual(['Maraude', 'Racolage', 'Réservation immédiate']);
  });
  it('uses complete Q11 choices, with no displaced text', () => {
    expect(bank()[0].questions.find(q => q.id === 11)?.choix[3].texte).toBe("apposer un panneau indiquant qu'il ne prend pas de client");
  });
  it('keeps approved Gestion206 B', () => { expect(key(1, 206)).toEqual(['B']); });
  it('normalizes Gestion48 only in the candidate', () => {
    expect(bank()[1].questions.find(q => q.id === 48)?.choix[0].texte).toBe('Un travailleur salarié');
  });
  it('keeps Q53 C without inventing an explanation', () => {
    expect(key(1, 53)).toEqual(['C']); expect(bank()[1].questions.find(q => q.id === 53)?.explication).toBeUndefined();
  });
  it('retains the 42 missing-admin SR questions in the detached candidate', () => {
    expect(bank()[2].questions.filter(q => q.id >= 214 && q.id <= 255)).toHaveLength(42);
  });
  it('uses image-supported SR16 choices and approved SR73 A', () => {
    expect(bank()[2].questions.find(q => q.id === 16)?.choix[0].texte).toBe("Obligation d'allumer ses feux");
    expect(key(2, 73)).toEqual(['A']);
  });
  it('retains real English195 and no placeholder194', () => {
    expect(bank()[4].questions.find(q => q.id === 195)?.enonce).toBe('A"tip" mean :');
    expect(bank()[4].questions.some(q => q.enonce === 'Nouvelle question')).toBe(false);
  });
  it('preserves approved common exclusive keys without duplicating them', () => {
    expect(key(0, 59)).toEqual(['C']); expect(key(0, 112)).toEqual(['A', 'B', 'C']);
    expect(key(0, 113)).toEqual(['B']); expect(key(0, 114)).toEqual(['C']);
    expect(key(1, 198)).toEqual(['B']); expect(key(1, 199)).toEqual(['B']);
  });
  it('suspends ambiguous road questions, never chooses a conflicting key', () => {
    for (const id of [79, 80, 92, 177, 212, 213]) {
      expect(bank()[2].questions.some(q => q.id === id)).toBe(false);
      expect(bank()[2].suspended.some(q => q.questionId === id)).toBe(true);
    }
  });
  it('uses only visually verified road images, never shifted TAXI files', () => {
    const q = (id: number) => bank()[2].questions.find(x => x.id === id);
    expect(q(55)?.image).toMatch(/^question-images\/module-5\/q55_/);
    expect(q(60)?.image).toMatch(/^question-images\/module-5\/q60_/);
    expect(q(61)?.image).toMatch(/^question-images\/module-5\/q61_/);
    for (const id of [68, 70, 81, 107]) expect(q(id)?.image).toBeNull();
    expect(bank()[2].questions.some(x => /\/cours\/exercices\/securite\/image(59|6\d|[7-9]\d|10[0-4])\.png/.test(x.image ?? ''))).toBe(false);
    expect(q(1)?.image).toBe('/cours/exercices/securite/image1.png');
  });
  it('orders every candidate by stable source number with no duplicate IDs', () => {
    for (const subject of bank()) {
      const ids = subject.questions.map(q => q.id);
      expect(ids).toEqual([...ids].sort((a, b) => a - b)); expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it('isolates only a matching server receipt', () => {
    const receipt = { passageId: 'receipt-1', versionId: 'version-1', moduleId: 5, exerciseId: 500, ownerId: 'technical-A' };
    expect(selectBilanFutureRoute({ ...context, receipt })).toBe('isolated');
    expect(selectBilanFutureRoute({ ...context, receipt: { ...receipt, ownerId: 'technical-B' } })).toBe('blocked');
    expect(selectBilanFutureRoute({ ...context, receipt: { ...receipt, exerciseId: 501 } })).toBe('blocked');
  });
  it('fails closed when the receipt cannot be read', () => {
    expect(selectBilanFutureRoute({ ...context, receiptReadFailed: true })).toBe('blocked');
  });
  it('leaves all other module/exercise pairs outside this selector', () => {
    expect(selectBilanFutureRoute({ ...context, moduleId: 2, exerciseId: 500 })).toBe('legacy');
    expect(selectBilanFutureRoute({ ...context, moduleId: 11, exerciseId: 605 })).toBe('legacy');
  });
  it('freezes detached future text/choices against subsequent source edits', () => {
    const candidate = bank()[0].questions;
    const frozen = freezeBilanFutureCandidate(candidate); const first = frozen[0].enonce;
    candidate[0].enonce = 'later editor change'; expect(frozen[0].enonce).toBe(first);
    expect(Object.isFrozen(frozen[0].choix)).toBe(true);
  });
});