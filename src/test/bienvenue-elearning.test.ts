// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { datesAccesBienvenue, engagementsBienvenue, estBienvenueElearning, peutConfirmerBienvenue, restaurerEngagements, type AccesBienvenue } from '@/lib/bienvenueElearning';
import { generateRecapitulatifPDF } from '@/lib/pdf/recapitulatif-inscription';

const dossier: AccesBienvenue = { id: 'fictif', type_apprenant: 'vtc-e', date_debut_cours_en_ligne: '2026-11-03', date_fin_cours_en_ligne: '2027-03-31', date_debut_formation: '2026-10-01' };
describe('Engagements bienvenue e-learning', () => {
  it.each(['vtc-e', 'taxi-e', 'va-e', 'ta-e'])('exige les deux confirmations pour %s', type => {
    const a = { ...dossier, type_apprenant: type };
    expect(estBienvenueElearning(a)).toBe(true);
    for (const [acces, pratique] of [[false, false], [true, false], [false, true]]) expect(peutConfirmerBienvenue(a, acces, pratique)).toBe(false);
    expect(peutConfirmerBienvenue(a, true, true)).toBe(true);
  });
  it.each(['vtc', 'taxi', 'ta', 'va', 'continue-vtc', 'continue-taxi'])('ne requiert aucun nouvel engagement pour %s', type => {
    expect(peutConfirmerBienvenue({ id: 'fictif', type_apprenant: type }, false, false)).toBe(true);
  });
  it('prend les dates réelles d’accès avant les dates de formation', () => {
    expect(datesAccesBienvenue(dossier)).toEqual({ debut: '2026-11-03', fin: '2027-03-31', valides: true });
  });
  it('ne fabrique pas une fin d’accès et refuse les dates inconnues ou inversées', () => {
    for (const a of [{ ...dossier, date_fin_cours_en_ligne: null }, { ...dossier, date_fin_cours_en_ligne: '2026-01-01' }, { ...dossier, date_debut_cours_en_ligne: '2026-02-30' }]) expect(peutConfirmerBienvenue(a, true, true)).toBe(false);
    expect(peutConfirmerBienvenue(null, true, true)).toBe(false);
  });
  it('ne restaure les cases que pour le même dossier et les mêmes dates', () => {
    const saved = JSON.stringify(engagementsBienvenue(dossier, true, true));
    expect(restaurerEngagements(dossier, saved)).toEqual([true, true]);
    expect(restaurerEngagements({ ...dossier, id: 'autre' }, saved)).toEqual([false, false]);
    expect(restaurerEngagements({ ...dossier, date_debut_cours_en_ligne: '2026-11-04' }, saved)).toEqual([false, false]);
    expect(restaurerEngagements(dossier, null)).toEqual([false, false]);
  });
  it('le PDF conserve les dates et les deux confirmations, sans modifier la source', async () => {
    const preuve = engagementsBienvenue(dossier, true, true);
    const avant = JSON.stringify(preuve);
    const blob = generateRecapitulatifPDF({ nom: 'FICTIF', prenom: 'Test', email: '', telephone: '', numeroDossier: '', typeExamen: 'VTC', dateExamen: '17 novembre 2026', b2Vierge: true, engagementsElearning: preuve }, { returnBlob: true });
    expect(blob).toBeInstanceOf(Blob);
    if (!(blob instanceof Blob)) throw new Error('PDF absent');
    const path = '/tmp/bienvenue-elearning-fictif.pdf';
    writeFileSync(path, new Uint8Array(await blob.arrayBuffer()));
    const texte = execFileSync('pdftotext', ['-raw', path, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
    expect(texte).toContain('mardi 3 novembre 2026');
    expect(texte).toContain('mercredi 31 mars 2027');
    expect((texte.match(/\[X\]/g) || []).length).toBe(2);
    expect(texte).toContain('trois semaines à compter du lendemain');
    expect(JSON.stringify(preuve)).toBe(avant);
  });
});