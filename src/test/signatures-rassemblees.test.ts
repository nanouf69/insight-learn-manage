// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { rassemblerSignatures } from '../lib/signaturesRassemblees';
import { dateSignatureParis, dateSignatureAvecJour, datePresenceAvecJour, generateSignaturesRassembleesPdf } from '../lib/pdf/signatures-rassemblees';
import { resolvePratiqueSlotParts } from '../lib/pratiqueSlots';
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=';
const row = (id = 'fixture-1', demi = 'matin') => ({ id, date_emargement: '2026-10-13', demi_journee: demi, signed_at: '2026-10-13T07:30:00Z', signature_data_url: png, masque: false });
const session = (end = '16:00') => ({ sessions: { type_session: 'theorie', date_debut: '2026-10-01', date_fin: '2026-10-31', heure_debut: '09:00', heure_fin: end } });
describe('PDF de signatures rassemblées sans mutation', () => {
  it('ordonne le matin avant l’après-midi', () => {
    expect(rassemblerSignatures([row('a', 'apres_midi'), row('b')], [], [])[0].creneau).toBe('Matin');
  });
  it('préserve les versions distinctes, pas la copie doublonnée du même ID', () => {
    expect(rassemblerSignatures([row('a'), row('b'), row('a')], [], []).map(r => r.id)).toEqual(['a', 'b']);
  });
  it('exclut masqué, image absente et signature distante', () => {
    expect(rassemblerSignatures([{ ...row(), masque: true }, { ...row('b'), signature_data_url: null }, { ...row('c'), signature_data_url: 'https://example.invalid/pixel' }], [], [])).toEqual([]);
  });
  it.each(['vtc', 'taxi'] as const)('pratique %s et samedi conservés', type => {
    const p = { date: '2026-10-13', typeFormation: type, reservationCreneau: 'journee' as const, minutes: 360, label: '', parts: resolvePratiqueSlotParts({ matin: '9h-12h', apresmidi: '13h30-17h' }, type) };
    const result = rassemblerSignatures([row('a', 'apres_midi')], [p], [session()]);
    expect(result[0].horaires).toBe('13h30 - 17h'); expect(result[0].activite).toBe(`Pratique ${type.toUpperCase()}`);
    expect(rassemblerSignatures([{ ...row(), date_emargement: '2026-10-17' }], [], [session()])).toHaveLength(1);
  });
  it('théorie prend la session et non une estimation', () => {
    expect(rassemblerSignatures([row('a', 'apres_midi')], [], [session()])[0].horaires).toBe('13:00 - 16:00');
    expect(rassemblerSignatures([row()], [], [])[0].horaires).toBe('Horaires non déterminés');
    expect(rassemblerSignatures([row('a', 'apres_midi')], [], [session(), session('17:00')])[0].horaires).toBe('Horaires non déterminés');
  });
  it('soir jamais classé pratique', () => {
    const result = rassemblerSignatures([row('a', 'soir_2')], [], [{ sessions: { ...session().sessions, heure_debut: '17:00', heure_fin: '21:00' } }]);
    expect(result[0].horaires).toBe('18h30 - 21h00');
  });
  it('date signature Paris séparée de présence, sans date inventée', () => {
    expect(dateSignatureParis('2026-10-13T07:30:00Z')).toContain('09:30');
    expect(dateSignatureParis(null)).toContain('non renseignée');
  });
  it('affiche le jour de la semaine, en Europe/Paris', () => {
    expect(datePresenceAvecJour('2026-10-13')).toBe('Mardi 13/10/2026');
    expect(datePresenceAvecJour('2026-10-17')).toBe('Samedi 17/10/2026');
    expect(datePresenceAvecJour('date-invalide')).toBe('Date non renseignée');
    expect(dateSignatureAvecJour('2026-10-13T07:30:00Z')).toBe('Mardi 13/10/2026 09:30');
    expect(dateSignatureAvecJour(null)).toContain('non renseignée');
  });
  it('absence avec signature conservée et explicitement signalée', () => {
    expect(rassemblerSignatures([{ ...row(), absent: true }], [], [])[0].absent).toBe(true);
  });
  it('génère vraiment plusieurs pages et ne modifie rien', async () => {
    const source = Array.from({ length: 36 }, (_, i) => row(`fixture-${i}`));
    const before = JSON.stringify(source);
    const result = generateSignaturesRassembleesPdf({ nom: 'FICTIF', prenom: 'Test' }, rassemblerSignatures(source, [], [session()]));
    expect(result.pages).toBeGreaterThan(1);
    expect((await result.blob.arrayBuffer()).byteLength).toBeGreaterThan(1000);
    expect(JSON.stringify(source)).toBe(before);
  });
  it('aucun PDF vide présenté comme preuve', () => {
    expect(() => generateSignaturesRassembleesPdf({ nom: 'FICTIF' }, [])).toThrow();
  });
});