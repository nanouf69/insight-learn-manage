// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { calculerSignaturesManquantes, creneauxAttendus, dateDuJourParis } from '../lib/signaturesManquantes';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=';
const emarg = (date: string, demi: string, extra: any = {}) => ({ id: `e-${date}-${demi}`, date_emargement: date, demi_journee: demi, signature_data_url: png, signed_at: `${date}T07:30:00Z`, masque: false, ...extra });
const sessionTheorique = (overrides: any = {}) => ({
  liste_attente: false,
  date_debut: null, date_fin: null,
  sessions: { type_session: 'theorique', nom: 'Session VTC et TAXI', statut: 'planifiee', date_debut: '2026-10-05', date_fin: '2026-10-16', heure_debut: '09:00', heure_fin: '16:00', ...overrides },
});

describe('Signatures manquantes : calcul sans mutation', () => {
  it('journée standard = matin + après-midi ; soir = 2 créneaux', () => {
    expect(creneauxAttendus('09:00', '16:00')).toEqual(['matin', 'apres_midi']);
    expect(creneauxAttendus(null, null)).toEqual(['matin', 'apres_midi']);
    expect(creneauxAttendus('17:00', '21:00')).toEqual(['soir_1', 'soir_2']);
    expect(creneauxAttendus('13:00', '16:00')).toEqual(['apres_midi']);
    expect(creneauxAttendus('09:00', '12:00')).toEqual(['matin']);
  });

  it('ne compte pas le week-end d’une session théorique', () => {
    const result = calculerSignaturesManquantes([], [sessionTheorique()], [], '2026-10-16');
    const dates = new Set(result.map(r => r.date));
    expect(dates.has('2026-10-09')).toBe(true);  // vendredi
    expect(dates.has('2026-10-10')).toBe(false); // samedi
    expect(dates.has('2026-10-11')).toBe(false); // dimanche
    expect(dates.has('2026-10-12')).toBe(true);  // lundi
    expect(result.filter(r => r.date === '2026-10-05').map(r => r.creneau)).toEqual(['Matin', 'Après-midi']);
  });

  it('une signature réelle n’est jamais « manquante » ; une ligne masquée est ignorée', () => {
    const result = calculerSignaturesManquantes(
      [emarg('2026-10-05', 'matin'), { ...emarg('2026-10-05', 'apres_midi'), masque: true }],
      [sessionTheorique()],
      [],
      '2026-10-16',
    );
    expect(result.filter(r => r.date === '2026-10-05' && r.creneau === 'Matin')).toHaveLength(0);
    // L'émargement masqué ne compte pas comme signature : le créneau apparaît manquant.
    const apresMidi = result.find(r => r.date === '2026-10-05' && r.creneau === 'Après-midi');
    expect(apresMidi?.etat).toBe('manquante');
    expect(result.some(r => r.date === '2026-10-06' && r.creneau === 'Matin')).toBe(true);
  });

  it('absence enregistrée ≠ signature manquante', () => {
    const result = calculerSignaturesManquantes(
      [{ id: 'a1', date_emargement: '2026-10-06', demi_journee: 'matin', absent: true, signature_data_url: null, signed_at: null, masque: false }],
      [sessionTheorique()],
      [],
      '2026-10-16',
    );
    const matin = result.find(r => r.date === '2026-10-06' && r.creneau === 'Matin');
    expect(matin?.etat).toBe('absence_enregistree');
    expect(result.find(r => r.date === '2026-10-06' && r.creneau === 'Après-midi')?.etat).toBe('manquante');
  });

  it('réservation pratique journée = 2 créneaux, matin seul = 1 ; samedi practice conservé', () => {
    const result = calculerSignaturesManquantes(
      [],
      [],
      [
        { date_choisie: '2026-10-17', type_formation: 'vtc', creneau: 'journee' },   // samedi
        { date_choisie: '2026-10-19', type_formation: 'taxi', creneau: 'matin' },
      ],
      '2026-10-20',
    );
    expect(result.filter(r => r.date === '2026-10-17').map(r => r.creneau).sort()).toEqual(['Après-midi', 'Matin']);
    expect(result.filter(r => r.date === '2026-10-19')).toHaveLength(1);
    expect(result[0].source).toContain('Pratique VTC');
  });

  it('les dates futures et les sessions annulées ne sont jamais signalées', () => {
    const result = calculerSignaturesManquantes(
      [],
      [sessionTheorique({ statut: 'annulee' }), sessionTheorique({ date_debut: '2026-10-15', date_fin: '2026-10-30' })],
      [{ date_choisie: '2026-10-25', type_formation: 'vtc', creneau: 'journee' }],
      '2026-10-14',
    );
    expect(result).toHaveLength(0);
  });

  it('liste d’attente et session pratique avec horaires respectés ; date Paris', () => {
    const result = calculerSignaturesManquantes(
      [],
      [
        { ...sessionTheorique(), liste_attente: true },
        { liste_attente: false, date_debut: null, sessions: { type_session: 'pratique', nom: 'Pratique VTC', statut: 'planifiee', date_debut: '2026-10-13', date_fin: '2026-10-13', heure_debut: '09:00', heure_fin: '17:00' } },
      ],
      [],
      '2026-10-14',
    );
    expect(result.map(r => r.creneau).sort()).toEqual(['Après-midi', 'Matin']);
    expect(dateDuJourParis(new Date('2026-10-13T23:30:00Z'))).toBe('2026-10-14');
  });
});
