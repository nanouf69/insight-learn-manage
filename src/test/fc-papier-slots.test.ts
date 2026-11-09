import { describe, it, expect } from 'vitest';
import { fcPapierSlots } from '../lib/fcPapierSlots';
describe('FC paper slots',()=>{
  it('29–30 September has four slots totaling 14 hours',()=>{
    const slots=fcPapierSlots('2026-09-29','2026-09-30');
    expect(slots.map(s=>[s.date,s.creneau,s.heures])).toEqual([
      ['2026-09-29','matin',3],['2026-09-29','apres_midi',4],
      ['2026-09-30','matin',3],['2026-09-30','apres_midi',4],
    ]);
    expect(slots.reduce((sum,s)=>sum+s.heures,0)).toBe(14);
  });
  it('does not fabricate slots outside dates or weekends',()=>{
    expect(fcPapierSlots('2026-10-10','2026-10-11')).toEqual([]);
    expect(fcPapierSlots('2026-10-12','2026-10-11')).toEqual([]);
  });
});