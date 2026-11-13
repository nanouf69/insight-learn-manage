import { describe, expect, it } from 'vitest';
import { assuranceVide } from './contratLocationClauses';
import { locationMailBlockers, LOCATION_SIGNATURE_ACTIVE } from './locationSignature';
import { sendLocation, signLocation, type LocationFrozen, type LocationSigningDeps } from '../../supabase/functions/_shared/locationSignatureCore';

const context = {
  locataire: { nomComplet: 'Client Fictif', email: 'client@example.test', telephone: '0102030405', adresse: '1 rue Test', numPermis: '123', dateDelivrancePermis: '2020-01-01', prefecturePermis: 'Lyon' },
  vehiculeChoisi: true, immatriculation: 'AA-123-BB', dateDebut: '2026-11-13', dateFin: '2026-11-14', prixLocation: '100', tarifJournalier: '50', regime: 'professionnel' as const,
  assurance: { ...assuranceVide(), assureur: 'Fictif', numeroPolice: 'test', validiteDebut: '2026-01-01', validiteFin: '2027-01-01', locationPayanteAutorisee: true, usageFormationExamenAutorise: true, conducteursAutorises: 'client', plafondRc: 'preuve', garanties: { dommages: false, vol: false, incendie: false, brisDeGlace: false, assistance: false }, exclusions: 'preuve', demarchesDelais: 'preuve' }, texteValideJuridiquement: true,
};
function fixture() {
  let doc: LocationFrozen = { id: 'doc-test', learnerId: 'client-test', recipient: 'client@example.test', fingerprint: 'sha-test', pdfPath: 'private/test.pdf', status: 'prepare', delivery: 'prepare' };
  let mails = 0;
  let outcome: 'accepted' | 'refused' | 'unknown' = 'accepted';
  const deps: LocationSigningDeps = {
    read: async () => ({ ...doc }), verify: async d => d.fingerprint === 'sha-test',
    claim: async (_, expected) => { if (doc.delivery !== expected) return false; doc = { ...doc, delivery: 'en_cours' }; return true; },
    mail: async () => { mails++; return outcome; },
    finishMail: async (_, r, previous) => { doc = { ...doc, delivery: r === 'unknown' ? 'indetermine' : r === 'refused' ? previous : 'envoye', status: r === 'accepted' ? 'envoye' : doc.status }; return true; },
    sign: async () => false,
  };
  return { deps, getDoc: () => doc, mails: () => mails, unknown: () => { outcome = 'unknown'; }, signed: () => { doc = { ...doc, status: 'signe' }; } };
}
describe('rental signing safety (isolated only)', () => {
  it('activation stays off even for complete essential fields', () => {
    expect(LOCATION_SIGNATURE_ACTIVE).toBe(false);
    expect(locationMailBlockers(context, [], true)).toEqual([]);
    expect(locationMailBlockers(context, [], false)).toHaveLength(1);
  });
  it('licence remains mandatory', () => expect(locationMailBlockers({ ...context, locataire: { ...context.locataire, numPermis: '' } }, [], true)).toContain('Permis B (numéro, date, autorité de délivrance)'));
  it('written insurance authorization remains mandatory for email signing', () => expect(locationMailBlockers({ ...context, assurance: { ...context.assurance, locationPayanteAutorisee: null } }, [], true)).toContain("Annexe assurance : Autorisation explicite de la location payante par l'assureur"));
  it('admin text validation remains mandatory', () => expect(locationMailBlockers({ ...context, texteValideJuridiquement: false }, [], true)).toContain('Validation du texte final après vérification juridique humaine'));
  it('double click yields one mail only', async () => { const f = fixture(); await Promise.all([sendLocation(f.deps, 'doc-test', 'op1'), sendLocation(f.deps, 'doc-test', 'op1')]); expect(f.mails()).toBe(1); expect(f.getDoc().delivery).toBe('envoye'); });
  it('unknown delivery blocks any automatic or explicit replay', async () => { const f = fixture(); f.unknown(); expect((await sendLocation(f.deps, 'doc-test', 'op1')).state).toBe('unknown'); expect((await sendLocation(f.deps, 'doc-test', 'op2')).state).toBe('blocked'); expect(f.mails()).toBe(1); });
  it('resend requires a confirmed first send and preserves frozen reference', async () => { const f = fixture(); expect((await sendLocation(f.deps, 'doc-test', 'op1', true)).state).toBe('blocked'); await sendLocation(f.deps, 'doc-test', 'op1'); await sendLocation(f.deps, 'doc-test', 'op2', true); expect(f.mails()).toBe(2); expect(f.getDoc().fingerprint).toBe('sha-test'); });
  it('a signed copy never receives another mail', async () => { const f = fixture(); f.signed(); expect((await sendLocation(f.deps, 'doc-test', 'op1')).state).toBe('blocked'); expect(f.mails()).toBe(0); });
  it('unread fingerprint and missing consent cannot sign', async () => { const f = fixture(); await sendLocation(f.deps, 'doc-test', 'mail'); expect((await signLocation(f.deps, 'doc-test', { fingerprint: 'other', signature: '', consent: true, operation: 'sign' })).state).toBe('blocked'); expect((await signLocation(f.deps, 'doc-test', { fingerprint: 'sha-test', signature: '', consent: false, operation: 'sign' })).state).toBe('blocked'); });
  it('invalid signature is never stored', async () => { const f = fixture(); await sendLocation(f.deps, 'doc-test', 'mail'); expect((await signLocation(f.deps, 'doc-test', { fingerprint: 'sha-test', signature: 'not-a-png', consent: true, operation: 'sign' })).state).toBe('invalid_signature'); expect(f.getDoc().signature).toBeUndefined(); });
});