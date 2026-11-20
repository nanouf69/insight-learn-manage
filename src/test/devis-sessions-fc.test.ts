import { describe, it, expect } from 'vitest';
import { joursSessionsFc } from '@/lib/devisSessionsFc';
const rows = [
  { id: '1', nom: 'Formation Continue TAXI - 19 et 20 novembre 2026', date_debut: '2026-11-19', date_fin: '2026-11-20' },
  { id: '2', nom: 'Formation Continue VTC - 17 et 18 novembre 2026', date_debut: '2026-11-17', date_fin: '2026-11-18' },
  { id: '3', nom: 'Formation continue TAXI', date_debut: '2026-07-23', date_fin: '2026-07-24' },
];
describe('dates FC du devis', () => {
  it('propose la session TAXI du 19-20/11 même le 21/11 (passée)', () => {
    const j = joursSessionsFc(rows, 'taxi', '2026-11-21');
    expect(j.map(x => x.iso)).toEqual(['2026-11-20', '2026-11-19', '2026-07-24', '2026-07-23']);
    expect(j[0].passe).toBe(true);
  });
  it('ne mélange pas VTC et TAXI', () => {
    expect(joursSessionsFc(rows, 'vtc', '2026-11-20').map(x => x.iso)).toEqual(['2026-11-18', '2026-11-17']);
  });
  it('sessions à venir en premier', () => {
    const j = joursSessionsFc(rows, 'taxi', '2026-11-20');
    expect(j[0]).toMatchObject({ iso: '2026-11-20', passe: false, jour: '20 novembre 2026' });
  });
});
