import { describe, it, expect } from 'vitest';
import { calculerSignaturesManquantes } from '../lib/signaturesManquantes';

const S = (d: string, demi: string) => ({ date_emargement: d, demi_journee: demi, signature_data_url: 'data:image/png;base64,AAA', masque: false });

describe('bornes session_apprenants vs sessions', () => {
  const session = { type_session: 'theorique', nom: 'Session VTC soir', statut: 'planifiee', date_debut: '2026-09-14', date_fin: '2026-09-27', heure_debut: '17:00', heure_fin: '21:00' };

  it('n\'exige rien après la fin réelle de la session (ligne inscription 31/10)', () => {
    const rows = [{ liste_attente: false, date_debut: '2026-09-14', date_fin: '2026-10-31', sessions: session }];
    const out = calculerSignaturesManquantes([], rows, [], '2026-10-13');
    expect(out.every(m => m.date <= '2026-09-27')).toBe(true);
    expect(out.length).toBeGreaterThan(0);
  });

  it('respecte une fin personnelle plus courte que la session', () => {
    const rows = [{ liste_attente: false, date_debut: '2026-09-14', date_fin: '2026-09-18', sessions: session }];
    const out = calculerSignaturesManquantes([], rows, [], '2026-10-13');
    expect(out.every(m => m.date <= '2026-09-18')).toBe(true);
  });

  it('ne commence pas avant le début réel de la session', () => {
    const rows = [{ liste_attente: false, date_debut: '2026-09-01', date_fin: '2026-10-31', sessions: session }];
    const out = calculerSignaturesManquantes([], rows, [], '2026-10-13');
    expect(out.every(m => m.date >= '2026-09-14')).toBe(true);
  });

  it('toutes signées + pratique signée → aucune manquante (Nayfer)', () => {
    const rows = [{ liste_attente: false, date_debut: '2026-09-14', date_fin: '2026-10-31', sessions: session }];
    const emargs: any[] = [];
    const d = new Date('2026-09-14T00:00:00Z');
    while (d <= new Date('2026-09-27T00:00:00Z')) {
      const dow = d.getUTCDay();
      if (dow !== 0 && dow !== 6) {
        const iso = d.toISOString().slice(0, 10);
        emargs.push(S(iso, 'soir_1'), S(iso, 'soir_2'));
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
    const prat = { type_session: 'pratique', nom: 'Formation pratique VTC', statut: 'planifiee', date_debut: '2026-10-13', heure_debut: '09:00', heure_fin: '16:00' };
    const rows2 = [...rows, { liste_attente: false, sessions: prat }];
    const out = calculerSignaturesManquantes([...emargs, S('2026-10-13', 'matin'), S('2026-10-13', 'apres_midi')], rows2, [], '2026-10-13');
    expect(out).toEqual([]);
  });
});
