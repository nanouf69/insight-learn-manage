// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { calculerSignaturesManquantes } from '../lib/signaturesManquantes';

const sessionTheorique = (overrides: any = {}) => ({
  liste_attente: false,
  date_debut: null, date_fin: null,
  sessions: { type_session: 'theorique', nom: 'Session VTC et TAXI', statut: 'planifiee', date_debut: '2026-09-07', date_fin: '2026-09-11', heure_debut: '09:00', heure_fin: '16:00', ...overrides },
});

describe('Signatures manquantes : horaires réels affichés, jamais inventés', () => {
  it('journée standard 9h-16h : Matin 9h-12h, Après-midi 13h-16h', () => {
    const rows = calculerSignaturesManquantes([], [sessionTheorique()], [], '2026-09-11');
    const lundi = rows.filter(r => r.date === '2026-09-07');
    expect(lundi.find(r => r.creneau === 'Matin')?.horaires).toBe('9h-12h');
    expect(lundi.find(r => r.creneau === 'Après-midi')?.horaires).toBe('13h-16h');
  });

  it('session du soir 17h-21h : Soir 1 17h-18h30, Soir 2 18h30-21h', () => {
    const rows = calculerSignaturesManquantes([], [sessionTheorique({ heure_debut: '17:00', heure_fin: '21:00', nom: 'Session soir' })], [], '2026-09-11');
    const lundi = rows.filter(r => r.date === '2026-09-07');
    expect(lundi.find(r => r.creneau === 'Soir 1 (17h-18h30)')?.horaires).toBe('17h-18h30');
    expect(lundi.find(r => r.creneau === 'Soir 2 (18h30-21h)')?.horaires).toBe('18h30-21h');
  });

  it('formation continue 13h-17h : Après-midi 13h-17h (horaires de la session, jamais généralisés)', () => {
    const row = { ...sessionTheorique({ heure_debut: '13:00', heure_fin: '17:00', nom: 'FC VTC' }), type_apprenant: 'continue-vtc' };
    const rows = calculerSignaturesManquantes([], [row], [], '2026-09-11');
    expect(rows.find(r => r.date === '2026-09-07' && r.creneau === 'Après-midi')?.horaires).toBe('13h-17h');
    expect(rows.some(r => r.creneau === 'Matin')).toBe(false);
  });

  it('réservation pratique avec planning du jour : horaires du créneau réservé', () => {
    const configs = [{ id: 'c1', updated_at: '2026-01-01', day_time_slots: { '2026-09-07': { matin: '9h-12h', apresmidi: '13h-16h' } } }];
    const rows = calculerSignaturesManquantes(
      [],
      [],
      [{ id: 'r1', date_choisie: '2026-09-07', type_formation: 'vtc', creneau: 'journee' }],
      '2026-09-11',
      configs,
    );
    const lundi = rows.filter(r => r.date === '2026-09-07');
    expect(lundi.find(r => r.creneau === 'Matin')?.horaires).toBe('9h-12h');
    expect(lundi.find(r => r.creneau === 'Après-midi')?.horaires).toBe('13h-16h');
  });

  it('session pratique avec ses propres horaires : après-midi 13h-17h reporté fidèlement', () => {
    const pratique = {
      liste_attente: false,
      sessions: { type_session: 'pratique', nom: 'Pratique', statut: 'planifiee', date_debut: '2026-09-07', heure_debut: '13:00', heure_fin: '17:00' },
    };
    const rows = calculerSignaturesManquantes([], [pratique], [], '2026-09-11');
    expect(rows.find(r => r.date === '2026-09-07' && r.creneau === 'Après-midi')?.horaires).toBe('13h-17h');
    expect(rows.some(r => r.creneau === 'Matin')).toBe(false);
  });
});
