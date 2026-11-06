import { describe, it, expect } from 'vitest';
import { libelleActivitesModule, jalonsRestants } from './affichageJalons';

describe('affichage jalons', () => {
  it('aucune activité exigée : pas de 1/0', () => { expect(libelleActivitesModule(['a'], [])).toBeNull(); });
  it('compte seulement les activités exigées', () => { expect(libelleActivitesModule(['a', 'x'], ['a', 'b'])).toBe('1/2 terminée(s)'); });
  it('7/7 modules mais pratique non signée : pratique listée', () => {
    const lignes = [{ moduleId: 2, valide: true, progression: 100, minutesCpf: 600 }, { moduleId: -1, valide: false, progression: 0, minutesCpf: 360 }];
    expect(jalonsRestants(lignes, (id) => id === -1 ? 'Pratique' : `M${id}`)).toEqual(['Pratique (6h00, 0 %)']);
  });
  it('tout validé : rien à faire', () => { expect(jalonsRestants([{ moduleId: 2, valide: true, progression: 100, minutesCpf: 60 }], String)).toEqual([]); });
});
