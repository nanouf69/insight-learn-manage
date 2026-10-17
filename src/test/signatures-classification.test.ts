// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { calculerSignaturesManquantes, calculerBilanSignaturesEdof, classifierSignatures } from '../lib/signaturesManquantes';

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=';
const emarg = (date: string, demi: string, extra: any = {}) => ({ id: `e-${date}-${demi}`, date_emargement: date, demi_journee: demi, signature_data_url: png, signed_at: `${date}T07:30:00Z`, masque: false, ...extra });
const insc = (session: any, extra: any = {}) => ({ liste_attente: false, date_debut: null, date_fin: null, ...extra, sessions: session });
const theo = (overrides: any = {}) => ({ type_session: 'theorique', nom: 'Session TA', statut: 'planifiee', date_debut: '2026-09-07', date_fin: '2026-09-28', heure_debut: '09:00', heure_fin: '16:00', ...overrides });

describe('Signatures rattachées aux inscriptions de session (théorie + pratique)', () => {
  it('inscription exclue (emargements_exclus) : aucune attente, signatures du jour classées hors session mais conservées', () => {
    const rows = [insc(theo(), { emargements_exclus: true })];
    const attendus = calculerSignaturesManquantes([], rows, [], '2026-10-17');
    expect(attendus).toHaveLength(0);
    const c = classifierSignatures([emarg('2026-09-08', 'matin')], rows, [], '2026-10-17');
    expect(c.valides).toHaveLength(0);
    expect(c.horsSession).toEqual([{ date: '2026-09-08', creneau: 'Matin' }]);
  });

  it('deux sessions retenues : attendus sur les deux, sans double compte des jours chevauchants', () => {
    const rows = [
      insc(theo()),
      insc(theo({ nom: 'Session TA bis', date_debut: '2026-09-14', date_fin: '2026-10-09' })),
    ];
    const attendus = calculerSignaturesManquantes([], rows, [], '2026-10-17');
    const jours = new Set(attendus.map((a) => a.date));
    // 07/09 → 09/10 jours ouvrés, chaque jour une seule fois malgré le chevauchement
    expect(jours.has('2026-09-14')).toBe(true);
    expect(attendus.filter((a) => a.date === '2026-09-14')).toHaveLength(2); // matin + après-midi, pas 4
    expect(jours.has('2026-10-03')).toBe(false); // samedi
  });

  it('pratique 9h-12h : réservation « journee » du même jour ne crée pas d’après-midi ; après-midi signé conservé mais NON compté', () => {
    const rows = [insc({ type_session: 'pratique_taxi', nom: 'Formation pratique TAXI', statut: 'planifiee', date_debut: '2026-10-17', date_fin: '2026-10-17', heure_debut: '09:00', heure_fin: '12:00' })];
    const resas = [{ date_choisie: '2026-10-17', type_formation: 'taxi', creneau: 'journee' }];
    const attendus = calculerSignaturesManquantes([], rows, resas, '2026-10-17');
    expect(attendus.map((a) => a.creneau)).toEqual(['Matin']);
    const c = classifierSignatures([emarg('2026-10-17', 'matin'), emarg('2026-10-17', 'apres_midi')], rows, resas, '2026-10-17');
    // Seul le matin (créneau prévu) est valide ; l'après-midi reste intact en horsSession + anomalie.
    expect(c.valides).toEqual([{ date: '2026-10-17', creneau: 'Matin' }]);
    expect(c.horsSession).toEqual([{ date: '2026-10-17', creneau: 'Après-midi' }]);
    expect(c.attendus).toHaveLength(0);
    const anomalieCreneau = c.anomalies.find((a) => a.creneau === 'Après-midi' && a.detail.includes('non prévu'));
    expect(anomalieCreneau).toBeTruthy();
    expect(c.anomalies.some((a) => a.detail.includes('Réservation'))).toBe(true);
  });

  it('bilan EDOF : pratique 9h-12h compte 1 (matin), jamais 2 — après-midi signé part en horsPlanning', () => {
    const rows = [insc({ type_session: 'pratique_taxi', nom: 'Formation pratique TAXI', statut: 'planifiee', date_debut: '2026-10-17', date_fin: '2026-10-17', heure_debut: '09:00', heure_fin: '12:00' })];
    const bilan = calculerBilanSignaturesEdof(
      [emarg('2026-10-17', 'matin'), emarg('2026-10-17', 'apres_midi')],
      rows,
      [{ date_choisie: '2026-10-17', type_formation: 'taxi', creneau: 'journee' }],
      'TAXI',
    );
    expect(bilan.pratique).toBe(1);
    expect(bilan.horsPlanning).toEqual([{ date: '2026-10-17', creneau: 'Après-midi' }]);
  });

  it('inscription pratique exclue : sa réservation du même jour ne contourne pas l’exclusion', () => {
    const rows = [insc({ type_session: 'pratique_taxi', nom: 'Pratique', statut: 'planifiee', date_debut: '2026-07-10', date_fin: '2026-07-10', heure_debut: '09:00', heure_fin: '16:00' }, { emargements_exclus: true })];
    const resas = [{ date_choisie: '2026-07-10', type_formation: 'taxi', creneau: 'journee' }];
    expect(calculerSignaturesManquantes([], rows, resas, '2026-10-17')).toHaveLength(0);
    const bilan = calculerBilanSignaturesEdof([emarg('2026-07-10', 'matin')], rows, resas, 'TAXI');
    expect(bilan.pratique).toBe(0);
    expect(bilan.horsPlanning).toEqual([{ date: '2026-07-10', creneau: 'Matin' }]);
  });

  it('fiche obsolète : les dates globales de la fiche ne créent jamais d’attente (seules les inscriptions comptent)', () => {
    // Aucun paramètre date_debut_formation/date_fin_formation n'existe dans le calcul :
    // sans inscription, zéro attente même si la fiche porte d'autres dates.
    const attendus = calculerSignaturesManquantes([], [], [], '2026-10-17');
    expect(attendus).toHaveLength(0);
  });

  it('signature masquée : ignorée partout (ni valide, ni hors session, créneau de nouveau attendu)', () => {
    const rows = [insc(theo())];
    const c = classifierSignatures([{ ...emarg('2026-09-08', 'matin'), masque: true }], rows, [], '2026-10-17');
    expect(c.valides).toHaveLength(0);
    expect(c.horsSession).toHaveLength(0);
    expect(c.attendus.some((a) => a.date === '2026-09-08' && a.creneau === 'Matin')).toBe(true);
  });

  it('timestamp différent de la date de cours : la signature reste rattachée à sa date d’émargement, jamais réattribuée', () => {
    const rows = [insc(theo())];
    // Signée en septembre sur une feuille de juillet (hors périmètre) : conservée, hors session.
    const c = classifierSignatures(
      [{ ...emarg('2026-07-10', 'matin'), signed_at: '2026-09-15T08:00:00Z' }],
      rows, [], '2026-10-17',
    );
    expect(c.horsSession).toEqual([{ date: '2026-07-10', creneau: 'Matin' }]);
    expect(c.valides).toHaveLength(0);
  });

  it('historique hors périmètre : anciennes signatures non supprimées, listées hors session', () => {
    const rows = [insc(theo()), insc(theo({ nom: 'Ancienne mai', date_debut: '2026-05-04', date_fin: '2026-05-25' }), { emargements_exclus: true })];
    const c = classifierSignatures(
      [emarg('2026-05-06', 'matin'), emarg('2026-05-06', 'apres_midi'), emarg('2026-09-08', 'matin')],
      rows, [], '2026-10-17',
    );
    expect(c.horsSession).toHaveLength(2);
    expect(c.valides).toEqual([{ date: '2026-09-08', creneau: 'Matin' }]);
    expect(c.attendus.some((a) => a.date.startsWith('2026-05'))).toBe(false);
  });

  it('session examen : aucune attente d’émargement', () => {
    const rows = [insc({ type_session: 'examen', nom: 'Session examen', statut: 'planifiee', date_debut: '2026-09-29', date_fin: '2026-09-29', heure_debut: '14:00', heure_fin: '16:00' })];
    expect(calculerSignaturesManquantes([], rows, [], '2026-10-17')).toHaveLength(0);
  });
});
