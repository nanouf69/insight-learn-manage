// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
const mocks = vi.hoisted(() => ({ load: vi.fn(), pdf: vi.fn() }));
vi.mock('../lib/signaturesRassemblees', () => ({ chargerSignaturesRassemblees: mocks.load }));
vi.mock('../lib/pdf/signatures-rassemblees', () => ({ generateSignaturesRassembleesPdf: mocks.pdf }));
import { ajouterSignaturesPresentielAuZip, inclureSignaturesPresentiel } from '../lib/controleZipSignatures';
const learner = { id: 'fictif', nom: 'FICTIF', prenom: 'Test', type_apprenant: 'vtc' };
beforeEach(() => vi.resetAllMocks());
describe('ZIP Contrôle — signatures session + pratique', () => {
  it.each(['vtc', 'taxi', 'ta', 'va', 'vtc-cours-du-soir', 'continue-vtc', 'continue-taxi', 'vtc-e-presentiel', 'TAXI'])('présentiel %s sans restriction de date', type => {
    expect(inclureSignaturesPresentiel({ type_apprenant: type })).toBe(true);
  });
  it.each(['vtc-e', 'taxi-e', 'ta-e', 'va-e', 'vtc-elearning', 'taxi-elearning', 'VTC-E', ''])('e-learning ou inconnu %s inchangé', type => {
    expect(inclureSignaturesPresentiel({ type_apprenant: type })).toBe(false);
  });
  it('repli formation choisie', () => expect(inclureSignaturesPresentiel({ formation_choisie: 'taxi' })).toBe(true));
  it('réutilise exactement le loader planning et le PDF, conserve toutes versions et pièces', async () => {
    const rows = [{ id: 'theorie-v1' }, { id: 'theorie-v2' }, { id: 'pratique' }];
    mocks.load.mockResolvedValue(rows);
    mocks.pdf.mockReturnValue({ fileName: 'signatures.pdf', blob: new Uint8Array([37, 80, 68, 70]) });
    const zip = new JSZip().file('piece-existante.txt', 'original');
    await ajouterSignaturesPresentielAuZip(zip, learner);
    expect(mocks.load).toHaveBeenCalledWith('fictif', true);
    expect(mocks.pdf).toHaveBeenCalledWith(learner, rows);
    const archive = await JSZip.loadAsync(await zip.generateAsync({ type: 'uint8array' }));
    expect(await archive.file('piece-existante.txt')?.async('string')).toBe('original');
    expect(await archive.file('signatures-session-pratique/signatures.pdf')?.async('string')).toBe('%PDF');
    expect(rows.map(r => r.id)).toEqual(['theorie-v1', 'theorie-v2', 'pratique']);
  });
  it('aucun nouveau chargement pour e-learning', async () => {
    await ajouterSignaturesPresentielAuZip(new JSZip(), { ...learner, type_apprenant: 'vtc-e' });
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it('erreur de lecture interrompt, jamais assimilée à zéro', async () => {
    mocks.load.mockRejectedValue(new Error('network'));
    await expect(ajouterSignaturesPresentielAuZip(new JSZip(), learner)).rejects.toThrow('indisponibles');
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it('zéro prouvé est explicite sans faux PDF', async () => {
    mocks.load.mockResolvedValue([]);
    const zip = new JSZip();
    await ajouterSignaturesPresentielAuZip(zip, learner);
    expect(await zip.file('signatures-session-pratique/aucune-signature.txt')?.async('string')).toContain('Aucune signature');
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it('le bouton réel raccorde avant la génération finale du ZIP', () => {
    const source = readFileSync('src/components/crm/apprenant-sections/ControleQualiteTab.tsx', 'utf8');
    expect(source.indexOf('await ajouterSignaturesPresentielAuZip(zip, apprenant)')).toBeLessThan(source.indexOf('await zip.generateAsync'));
    expect(source).toContain('feuilles-emargement-hebdomadaires');
    expect(source).toContain('feuilles-emargement-pratique');
  });
});