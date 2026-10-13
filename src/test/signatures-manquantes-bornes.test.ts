import { describe, it, expect } from 'vitest';
import { calculerSignaturesManquantes, calculerBilanSignaturesEdof } from '../lib/signaturesManquantes';

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

describe('bilan EDOF : compte exact et hors planning', () => {
  const mkSessions = () => [{ liste_attente: false, date_debut: '2026-09-14', date_fin: '2026-09-27', heure_debut_personnalisee: '17:00', sessions: { type_session: 'theorique', statut: 'terminee', date_debut: '2026-09-14', date_fin: '2026-09-27', heure_debut: '17:00', heure_fin: '21:00' } }];
  const mkResa = () => [{ date_choisie: '2026-10-13', type_formation: 'vtc', creneau: 'journee' }];
  const sig = (date: string, demi: string) => ({ date_emargement: date, demi_journee: demi, signature_data_url: 'data:image/png;base64,xxx', masque: false });
  it('complet seulement au compte exact (22/22), pas au-delà', () => {
    const soirs = ['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25'];
    const emargs = [...soirs.flatMap(d => [sig(d, 'soir_1'), sig(d, 'soir_2')]), sig('2026-10-13', 'matin'), sig('2026-10-13', 'apres_midi')];
    const ok = calculerBilanSignaturesEdof(emargs, mkSessions(), mkResa(), 'VTC');
    expect(ok.total).toBe(22); expect(ok.complet).toBe(true);
    const trop = calculerBilanSignaturesEdof([...emargs, sig('2026-09-28', 'soir_1'), sig('2026-09-28', 'soir_2')], mkSessions(), mkResa(), 'VTC');
    expect(trop.horsPlanning).toHaveLength(2); expect(trop.complet).toBe(true); expect(trop.excedent).toBe(false);
  });
  it('incomplet si une signature manque', () => {
    const soirs = ['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25'];
    const emargs = [...soirs.flatMap(d => [sig(d, 'soir_1'), sig(d, 'soir_2')]), sig('2026-10-13', 'matin')];
    expect(calculerBilanSignaturesEdof(emargs, mkSessions(), mkResa(), 'VTC').complet).toBe(false);
  });
});
