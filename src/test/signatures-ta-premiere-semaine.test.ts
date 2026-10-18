import { describe, it, expect } from 'vitest';
import { calculerBilanSignaturesEdof, calculerSignaturesManquantes, marquerFiliereRows } from '../lib/signaturesManquantes';

const theorie = (extra: any = {}) => ({ id: 't', liste_attente: false, emargements_exclus: false, date_debut: '2026-09-07', date_fin: '2026-09-28', ...extra,
  sessions: { type_session: 'theorique', statut: 'planifiee', date_debut: '2026-09-07', date_fin: '2026-09-28', heure_debut: '09:00', heure_fin: '16:00' } });
const pratique = { id: 'p', liste_attente: false, emargements_exclus: false, sessions: { type_session: 'pratique', statut: 'planifiee', date_debut: '2026-10-17', date_fin: '2026-10-17', heure_debut: '09:00', heure_fin: '16:00' } };
const sig = (date: string, demi: string) => ({ date_emargement: date, demi_journee: demi, signed_at: `${date}T10:00:00Z`, masque: false });

describe('TA : 10 théorie (première semaine) + 2 pratique', () => {
  it('objectif 12 et manquants limités au 7–11 septembre', () => {
    const rows = marquerFiliereRows([theorie(), pratique], 'TA');
    const manq = calculerSignaturesManquantes([sig('2026-10-17', 'matin'), sig('2026-10-17', 'apres_midi')], rows, [], '2026-10-18');
    expect(manq).toHaveLength(10);
    expect(manq.every(m => m.date >= '2026-09-07' && m.date <= '2026-09-11')).toBe(true);
    const b = calculerBilanSignaturesEdof([sig('2026-10-17', 'matin'), sig('2026-10-17', 'apres_midi')], [theorie(), pratique], [], 'ta');
    expect(b.objectifTotal).toBe(12);
    expect(b.pratique).toBe(2);
    expect(b.theorie).toBe(0);
  });
  it('signature de 2e semaine TA non comptée', () => {
    const b = calculerBilanSignaturesEdof([sig('2026-09-15', 'matin')], [theorie()], [], 'ta');
    expect(b.theorie).toBe(0);
  });
  it('fin personnalisée explicite (ancien parcours) conservée, rien inventé', () => {
    const rows = marquerFiliereRows([theorie({ date_fin_personnalisee: '2026-09-14' })], 'TA');
    expect(calculerSignaturesManquantes([], rows, [], '2026-10-18')).toHaveLength(12);
  });
  it('TAXI non limité', () => {
    const rows = marquerFiliereRows([theorie()], 'TAXI');
    expect(calculerSignaturesManquantes([], rows, [], '2026-10-18').length).toBe(30);
  });
});
