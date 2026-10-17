// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { calculerSignaturesManquantes, classifierSignatures, calculerBilanSignaturesEdof } from '../lib/signaturesManquantes';
import { calculerTauxPresenceHeures } from '../components/crm/TauxPresenceSessionsCard';
import { resolvePratiqueSlotParts } from '../lib/pratiqueSlots';
const date = '2026-10-17';
const sig = (demi: string, extra: any = {}) => ({ date_emargement: date, demi_journee: demi, signature_data_url: 'data:image/png;base64,YQ==', ...extra });
const session = (extra: any = {}) => ({ liste_attente: false, sessions: { type_session: 'pratique_taxi', date_debut: date, date_fin: date, heure_debut: '09:00', heure_fin: '12:00', ...extra } });
const resa = [{ date_choisie: date, creneau: 'journee', type_formation: 'taxi' }];
const config = (slot: any) => [{ day_time_slots: { [date]: slot } }];
describe('Planning pratique prioritaire, sans mutation de preuve', () => {
  it('journée réservée sans horaires = 9–12 et 13–16 malgré ancienne session automatique 9–12', () => {
    const rows = [sig('matin'), sig('apres_midi')];
    const before = JSON.stringify(rows);
    const c = classifierSignatures(rows, [session()], resa, date, config({ type: 'taxi' }));
    expect(c.valides).toHaveLength(2); expect(c.horsSession).toHaveLength(0);
    expect(calculerBilanSignaturesEdof(rows, [session()], resa, 'TAXI', config({ type: 'taxi' })).pratique).toBe(2);
    expect(calculerTauxPresenceHeures(rows, [session()], 'taxi', resa, config({ type: 'taxi' })).pratique.faites).toBe(6);
    expect(JSON.stringify(rows)).toBe(before);
  });
  it('planning explicitement matin seul = une signature, après-midi intact hors planning', () => {
    const rows = [sig('matin'), sig('apres_midi')];
    const cs = config({ matin: '9h-12h' });
    expect(classifierSignatures(rows, [session()], resa, date, cs).valides).toHaveLength(1);
    expect(calculerBilanSignaturesEdof(rows, [session()], resa, 'TAXI', cs).pratique).toBe(1);
    expect(calculerTauxPresenceHeures(rows, [session()], 'taxi', resa, cs).pratique.faites).toBe(3);
  });
  it('réservation matin préservée sur planning journée', () => {
    const rs = [{ ...resa[0], creneau: 'matin' }];
    expect(calculerSignaturesManquantes([], [session()], rs, date, config({ matin: '9h-12h', apresmidi: '13h-16h' }))).toHaveLength(1);
  });
  it('demi-journée absente du planning explicite jamais fabriquée', () => {
    expect(resolvePratiqueSlotParts({ matin: '9h-12h' }, 'taxi', 'apresmidi')).toEqual([]);
  });
  it('inscription exclue non contournée par réservation', () => {
    expect(calculerSignaturesManquantes([], [{ ...session(), emargements_exclus: true }], resa, date, config({ type: 'taxi' }))).toHaveLength(0);
  });
});
describe('Listes d’attente : rattachement identifié mais non compté', () => {
  it.each([['09:00','16:00','matin','apres_midi'], ['17:00','21:00','soir_1','soir_2']])('respecte les créneaux %s–%s', (start, end, a, b) => {
    const ss = [{ ...session({ type_session: 'theorique', heure_debut: start, heure_fin: end }), liste_attente: true }];
    // 17 octobre samedi : choisir un jour de cours explicite de la semaine.
    ss[0].sessions.date_debut = '2026-10-16'; ss[0].sessions.date_fin = '2026-10-16';
    const rows = [sig(a, { date_emargement: '2026-10-16' }), sig(b, { date_emargement: '2026-10-16' })];
    const c = classifierSignatures(rows, ss, [], date);
    expect(c.aVerifier).toHaveLength(2); expect(c.horsSession).toHaveLength(0); expect(c.valides).toHaveLength(0);
    expect(c.aVerifier.every(r => !r.source?.includes('incohérent'))).toBe(true);
    expect(calculerSignaturesManquantes([], ss, [], date)).toEqual([]);
    expect(calculerBilanSignaturesEdof(rows, ss, [], 'VTC')).toMatchObject({ total: 0, horsPlanning: [], aVerifier: c.aVerifier });
    expect(calculerTauxPresenceHeures(rows, ss, 'vtc').session.faites).toBe(0);
  });
  it('signature de jour sur attente cours du soir = incohérence, pas sans-session', () => {
    const ss = [{ ...session({ type_session: 'theorique', heure_debut: '17:00', heure_fin: '21:00' }), liste_attente: true }];
    const c = classifierSignatures([sig('matin')], ss, [], date);
    expect(c.aVerifier[0]?.source).toContain('incohérent'); expect(c.horsSession).toEqual([]);
  });
  it('feuille juillet signée septembre masquée reste historique, aucune présence septembre', () => {
    const rows = [sig('matin', { date_emargement: '2026-07-01', signed_at: '2026-09-08T09:00:00Z', masque: true })];
    const before = JSON.stringify(rows);
    const c = classifierSignatures(rows, [], [], date);
    expect(c.valides).toEqual([]); expect(c.anomalies[0]?.detail).toContain('2026-09-08'); expect(JSON.stringify(rows)).toBe(before);
  });
});