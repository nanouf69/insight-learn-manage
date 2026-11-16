import { describe, it, expect } from 'vitest';
import { datesFormationProchaines } from '../lib/datesFormationProchaines';
describe('Prochaines formations', () => {
  it('propose uniquement aujourd’hui et les dates suivantes en heure Paris', () => {
    expect(datesFormationProchaines(['2026-11-15', '2026-11-16', '2026-11-17'], new Date('2026-11-16T13:38:00Z'))).toEqual(['2026-11-16', '2026-11-17']);
  });
});