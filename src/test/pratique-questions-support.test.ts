import { describe, it, expect } from 'vitest';
import { pratiqueQuestionsSupport } from '@/lib/pratiqueQuestionsSupport';
import { activitesDuModule } from '@/lib/jeuxPedagogiques';

describe('Questions pratiques : pièces de consultation séparées', () => {
  it('TAXI : uniquement module 6, cours Déroulement id 2, 20 pages distinctes', () => {
    const s = pratiqueQuestionsSupport(6, 2);
    expect(s?.formation).toBe('taxi');
    expect(s?.pages).toHaveLength(20);
    expect(s?.pages[19]).toBe('cours-images/pratique-taxi-20261104/page-20.jpg');
    expect(new Set(s?.pages).size).toBe(20);
  });
  it('VTC : uniquement module 8, cours Déroulement id 2, source séparée', () => {
    const s = pratiqueQuestionsSupport(8, 2);
    expect(s?.formation).toBe('vtc');
    expect(s?.pages).toHaveLength(20);
    expect(s?.pages[0]).toBe('cours-images/pratique-vtc-20261104/page-01.jpg');
  });
  it('ne crée aucune obligation de réalisation', () => {
    const before = [6, 8].map(id => activitesDuModule(id));
    expect(pratiqueQuestionsSupport(6, 2)?.consultationSeule).toBe(true);
    expect(pratiqueQuestionsSupport(8, 2)?.consultationSeule).toBe(true);
    expect([6, 8].map(id => activitesDuModule(id))).toEqual(before);
    expect(before.flat().some(a => a.id.startsWith('questions-pratique'))).toBe(false);
  });
  it('ne propose aucun support dans les autres modules ou cours', () => {
    for (const id of [2, 7, 10, 35, 64, 70]) expect(pratiqueQuestionsSupport(id, 2)).toBeNull();
    for (const id of [1, 3, 9, 10]) {
      expect(pratiqueQuestionsSupport(6, id)).toBeNull();
      expect(pratiqueQuestionsSupport(8, id)).toBeNull();
    }
  });
});