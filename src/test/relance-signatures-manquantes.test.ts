import { describe, it, expect } from 'vitest';
import { creneauxRelancables, empreinteCreneauxRelance, resultatRelance } from '../lib/relanceSignaturesManquantes';
import { calculerSignaturesManquantes, type SignatureManquante } from '../lib/signaturesManquantes';

const slot: SignatureManquante = { date: '2026-10-20', creneau: 'Matin', source: 'Pratique VTC', etat: 'manquante' };
describe('Relance individuelle des signatures', () => {
  it('ne relance jamais les absences enregistrées', () => {
    expect(creneauxRelancables([slot, { ...slot, creneau: 'Après-midi', etat: 'absence_enregistree' }], '2026-10-20')).toEqual([slot]);
  });
  it('autorise le jour même mais jamais une date future', () => {
    expect(creneauxRelancables([slot], '2026-10-19')).toEqual([]);
    expect(creneauxRelancables([slot], '2026-10-20')).toEqual([slot]);
    expect(creneauxRelancables([slot], '2026-10-21')).toEqual([slot]);
  });
  it('une nouvelle signature après aperçu oblige à reconfirmer une liste différente', () => {
    expect(empreinteCreneauxRelance([slot])).not.toEqual(empreinteCreneauxRelance([]));
    expect(empreinteCreneauxRelance([slot])).not.toEqual(empreinteCreneauxRelance([{ ...slot, creneau: 'Après-midi' }]));
  });
  it('ne change pas la liste lors d’un simple tri de lecture', () => {
    const second = { ...slot, creneau: 'Après-midi' };
    expect(empreinteCreneauxRelance([slot, second])).toEqual(empreinteCreneauxRelance([second, slot]));
  });
  it('un doublon bloqué par le serveur n’est pas un nouvel envoi', () => {
    expect(resultatRelance({ success: true, skipped: true })).toBe('doublon');
    expect(resultatRelance({ success: true })).toBe('envoye');
    expect(resultatRelance(null)).toBe('indetermine');
    expect(resultatRelance({ success: false })).toBe('indetermine');
  });
  it('une image réelle exclut le créneau, une date seule ne le prouve pas', () => {
    const session = { liste_attente: false, sessions: { type_session: 'theorique', date_debut: '2026-10-20', date_fin: '2026-10-20', heure_debut: '09:00', heure_fin: '12:00' } };
    const row = { date_emargement: '2026-10-20', demi_journee: 'matin', signed_at: '2026-10-20T10:00:00Z' };
    expect(calculerSignaturesManquantes([row], [session], [], '2026-10-20')).toHaveLength(1);
    expect(calculerSignaturesManquantes([{ ...row, signature_data_url: 'data:image/png;base64,aGVsbG8=' }], [session], [], '2026-10-20')).toHaveLength(0);
  });
});