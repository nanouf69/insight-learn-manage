import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CONTRACT_FIELD_GROUPS, validateContract, validatePratique, pratiqueRecap, type TrainingContract, type PratiqueConditions } from '@/lib/contratFormation/model';
import { buildDevisContratSnapshot, parseDevisContratSnapshot, draftFromSnapshot, devisValantContrat } from '@/lib/contratFormation/devisContrat';
import { contractSections, PLANIFICATION_PRATIQUE } from '@/lib/contratFormation/text';
import { buildTrainingContractPdf } from '@/lib/contratFormation/pdf';
import { CONSENTEMENTS_SIGNATURE, CONSENTEMENTS_VERSION } from '@/lib/contratFormation/consentements';

const now = new Date('2026-10-17T14:30:00Z');
const solo = (): PratiqueConditions => ({ incluse: 'oui', heures: '2.5', mode: 'individuel', effectifPrevu: '1', effectifMax: '1', conduiteIndividuelle: '' });
function complete(p: PratiqueConditions = solo()): TrainingContract {
  const fields = Object.fromEntries(CONTRACT_FIELD_GROUPS.flatMap(g => g.fields.map(([key]) => [key, 'Référence fictive vérifiée'])));
  Object.assign(fields, { start: '2026-11-02', end: '2026-11-10', totalHours: '2.5', presenceHours: '0', distanceHours: '0', practiceHours: p.incluse === 'non' ? '0' : p.heures, price: '100', priceHT: '100', vatRate: '0', vatAmount: '0', vat: 'Article 261 CGI — fictif', headcount: p.mode === 'groupe' ? p.effectifPrevu : '1', conclusionMode: 'sur place' });
  return { reference: 'FICTIF', learnerId: 'fictif-A', sessionId: '', pathway: 'pratique-taxi', funding: 'personnel', fields,
    activities: [{ id: 'p', title: 'Pratique TAXI', activities: 'Conduite', modality: 'Présentiel', hours: '2.5', evaluation: 'Mise en situation', value: '100' }],
    payments: [{ amount: '30', date: '2026-11-01', milestone: 'a' }, { amount: '20', date: '2026-11-02', milestone: 'b' }, { amount: '20', date: '2026-11-05', milestone: 'c' }, { amount: '30', date: '2026-11-10', milestone: 'd' }],
    verified: true, concludedAt: null, signedAt: null, pratique: p };
}

describe('Devis valant contrat — pratique', () => {
  it('2,5 h individuel valide, effectif 1', () => { const c = complete(); expect(validateContract(c, c.learnerId, now).ready).toBe(true); });
  it('groupe 4/6 valide avec effectif contrat 4', () => { const c = complete({ ...solo(), mode: 'groupe', effectifPrevu: '4', effectifMax: '6' }); expect(validateContract(c, c.learnerId, now).ready).toBe(true); });
  it('individuel avec effectif 2 refusé', () => expect(validatePratique({ ...solo(), effectifPrevu: '2' }).length).toBeGreaterThan(0));
  it('groupe avec effectif 1 refusé', () => expect(validatePratique({ ...solo(), mode: 'groupe', effectifPrevu: '1', effectifMax: '3' }).length).toBeGreaterThan(0));
  it('groupe max < prévu refusé', () => expect(validatePratique({ ...solo(), mode: 'groupe', effectifPrevu: '5', effectifMax: '4' }).length).toBeGreaterThan(0));
  it('incluse avec 0 h refusée ; non incluse = 0 h admise', () => { expect(validatePratique({ ...solo(), heures: '0' }).length).toBeGreaterThan(0); expect(validatePratique({ ...solo(), incluse: 'non', heures: '0' })).toEqual([]); });
  it('inclusion non précisée bloque', () => expect(validatePratique({ ...solo(), incluse: '' }).length).toBe(1));
  it('heures article 3 ≠ pratique bloque', () => { const c = complete(); c.fields.practiceHours = '6'; expect(validateContract(c, c.learnerId, now).ready).toBe(false); });
  it('conduite individuelle > heures refusée', () => expect(validatePratique({ ...solo(), conduiteIndividuelle: '3' }).length).toBeGreaterThan(0));
  it('groupe sans temps individuel : aucune promesse de volant', () => expect(pratiqueRecap({ ...solo(), mode: 'groupe', effectifPrevu: '3', effectifMax: '3' })).toMatch(/n’est pas garanti/));
});

describe('Devis valant contrat — snapshot figé', () => {
  it('persistance : JSON relu identique, jamais signé, horodatage = génération réelle', () => {
    const snap = buildDevisContratSnapshot({ ...complete(), signedAt: '2026-10-01T00:00:00Z' }, now);
    const relu = parseDevisContratSnapshot(JSON.parse(JSON.stringify(snap)));
    expect(relu?.contract.pratique?.heures).toBe('2.5');
    expect(relu?.contract.pratique?.mode).toBe('individuel');
    expect(relu?.contract.signedAt).toBeNull();
    expect(relu?.genere_le).toBe(now.toISOString());
    expect(relu?.consentements_version).toBe(CONSENTEMENTS_VERSION);
  });
  it('reprise en brouillon : nouvelle référence, à revérifier, autre apprenant refusé', () => {
    const snap = buildDevisContratSnapshot(complete(), now);
    const d = draftFromSnapshot(snap, 'fictif-A');
    expect(d?.reference).not.toBe('FICTIF'); expect(d?.verified).toBe(false); expect(d?.pratique?.heures).toBe('2.5');
    expect(draftFromSnapshot(snap, 'fictif-B')).toBeNull();
  });
  it('version inconnue non lue', () => expect(parseDevisContratSnapshot({ version: 'x', contract: { fields: {} } })).toBeNull());
  it('régime contrat seulement en financement personnel', () => { for (const f of ['cpf', 'opco', 'entreprise', 'autre', ''] as const) expect(devisValantContrat({ ...complete(), funding: f })).toBe(false); expect(devisValantContrat(complete())).toBe(true); });
  it('formation commencée : jamais complet, statut régularisation', () => { const c = complete(); c.fields.start = '2026-10-16'; const v = validateContract(c, c.learnerId, now); expect(v.ready).toBe(false); expect(v.status).toMatch(/RÉGULARISATION/); });
});

describe('Devis valant contrat — documents et cases', () => {
  it('aperçu HTML et PDF portent la même récapitulation pratique', () => {
    const c = complete({ ...solo(), mode: 'groupe', effectifPrevu: '4', effectifMax: '6' });
    const html = contractSections(c, now).map(s => s.text).join('\n');
    expect(html).toContain(pratiqueRecap(c.pratique));
    const pdf = buildTrainingContractPdf(c, now, true).output();
    expect(pdf).toContain('2.5 h p');
    expect(pdf).toMatch(/effectif pr.vu 4, maximum 6/);
  });
  it('définitif bloqué si mention obligatoire manquante', () => { const c = complete(); c.fields.nda = ''; expect(() => buildTrainingContractPdf(c, now, true)).toThrow(); expect(() => buildTrainingContractPdf(c, now, false)).not.toThrow(); });
  it('texte : deux cases facultatives exactes et réserve L6353-5/L6353-6, aucune renonciation imposée', () => {
    const t = contractSections(complete(), now).find(s => s.title.startsWith('9 '))!.text;
    expect(t).toContain(CONSENTEMENTS_SIGNATURE.demarrageAnticipe);
    expect(t).toContain(CONSENTEMENTS_SIGNATURE.perteApresExecution);
    expect(t).toMatch(/L6353-5.*L6353-6/s);
    expect(t).toMatch(/n’empêche pas l’inscription/);
    expect(t).not.toMatch(/renonce en conséquence/);
  });
  it('serveur : textes et version des cases identiques au client, signature horodatée serveur, aucun écrasement', () => {
    const edge = readFileSync('supabase/functions/upload-devis-signe/index.ts', 'utf8');
    expect(edge).toContain(CONSENTEMENTS_SIGNATURE.demarrageAnticipe);
    expect(edge).toContain(CONSENTEMENTS_SIGNATURE.perteApresExecution);
    expect(edge).toContain(CONSENTEMENTS_VERSION);
    expect(edge).toContain('upsert: false');
    expect(edge).not.toContain('upsert: true');
    expect(edge).toMatch(/\.is\("signed_at", null\)/);
    expect(edge).toMatch(/const signedAt = new Date\(\)/);
  });
  it('cases décochées : signature possible (aucune exigence côté serveur)', () => {
    const edge = readFileSync('supabase/functions/upload-devis-signe/index.ts', 'utf8');
    expect(edge).not.toMatch(/!demarrage|!perte/);
  });
  it('planification pratique : clause présente HTML et PDF si incluse, absente si non incluse', () => {
    const c = complete();
    expect(contractSections(c, now).map(s => s.text).join('\n')).toContain(PLANIFICATION_PRATIQUE);
    expect(buildTrainingContractPdf(c, now, true).output()).toMatch(/responsable p.dagogique/);
    expect(PLANIFICATION_PRATIQUE).toMatch(/ne vaut ni abandon/);
    expect(PLANIFICATION_PRATIQUE).toMatch(/sans double paiement/);
    expect(contractSections(complete({ ...solo(), incluse: 'non', heures: '0', mode: '' }), now).map(s => s.text).join('\n')).not.toContain(PLANIFICATION_PRATIQUE);
  });
});
