import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@/assets/tampon-ftransport.png?inline', () => ({
  default: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
}));
import { FTRANSPORT, construireConvocationHtml } from '@/lib/convocationFormation';
import { buildCanonicalDevisPDF } from '@/lib/pdf/devis-canonical';
import { buildDevisFcTaxiPdf } from '@/lib/pdf/devis-fc-taxi';
import { generateDraftPDF } from '@/lib/pdf/draft-facture';

const SIRET = '82346156100016';
const pdfText = (doc: { output: (type: 'arraybuffer') => ArrayBuffer }) => Buffer.from(doc.output('arraybuffer')).toString('latin1');

describe('Identité légale du centre confirmée le 26/11/2026', () => {
  it('préremplit le SIRET exact du centre pour les convocations et contrats', () => {
    expect(FTRANSPORT.siret).toBe('82346156100016');
  });
  it.each(['convocation-ta', 'convocation-vtc-soir', 'convocation-taxi', 'convocation-vtc'])('%s : la signature du modèle enregistré ne réintroduit pas le mauvais SIRET', () => {
    const ancien = '<p><strong>Ftransport</strong><br>📍 86 route de Genas, 69003 Lyon<br>📞 04.72.43.43.00<br>✉️ contact@ftransport.fr<br>SIRET : 82346156100018<br>N° de déclaration d’activité : 84 69 15114 69</p>';
    const html = construireConvocationHtml({ intituleFormation: 'Formation', presentiel: true,
      acces: { statut: 'manquant', autorise: false, debut: null, fin: null }, corpsModele: ancien });
    expect(html).toContain('SIRET 82346156100016');
    expect(html).not.toContain('82346156100018');
    expect(ancien).toContain('82346156100018'); // le modèle conservé n'est pas réécrit
  });
  it.each(['vtc', 'taxi'] as const)('édite le devis canonique %s avec le SIRET exact', type => {
    const doc = buildCanonicalDevisPDF({
      numDevis: 'DV-TEST-SIRET', dateDevis: new Date('2026-11-26'), dateValidite: new Date('2026-12-26'),
      client: { prenom: 'Client', nom: 'Fictif' }, typeFinancement: 'organisme',
      financeur: { nom: 'Financeur fictif', siret: '11111111111111' },
      formation: { designation: `Formation ${type.toUpperCase()}`, type },
      lignes: [{ designation: 'Formation', quantite: 1, prixUnitaire: 200 }],
    });
    const texte = pdfText(doc);
    expect(texte).toContain(`SIRET : ${SIRET}`);
    expect(texte).not.toContain('82346156100018');
    expect(texte).toContain('11111111111111'); // le financeur ne prend pas le SIRET du centre
    writeFileSync(`/tmp/siret-devis-${type}.pdf`, Buffer.from(doc.output('arraybuffer')));
  });
  it('édite le devis FC TAXI avec le même SIRET', () => {
    const doc = buildDevisFcTaxiPdf({ client: { nomComplet: 'Client Fictif', adresse: '1 rue Exemple', codePostal: '69003', ville: 'Lyon', telephone: '', email: '' }, dates: '30 novembre 2026 + 1 décembre 2026', dateDevis: '26/11/2026', prix: 200, mode: 'centre' });
    expect(pdfText(doc)).toContain(`SIRET : ${SIRET}`);
  });
  it('édite la facture avec le SIRET exact sans enregistrer ni télécharger', async () => {
    const { blob } = await generateDraftPDF({ numero: 'TEST-SIRET', date: '2026-11-26', refDossier: 'Client Fictif', lignes: [] }, { final: true, download: false });
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error('PDF illisible'));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    expect(Buffer.from(buffer).toString('latin1').replace(/ /g, '')).toContain(`SIRET:${SIRET}`);
    writeFileSync('/tmp/siret-facture.pdf', Buffer.from(buffer));
  });
  it('aucun modèle de document ou signature du centre ne conserve un ancien SIRET', () => {
    const fichiers = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? fichiers(join(dir, e.name)) : /\.(tsx?|html)$/.test(e.name) ? [join(dir, e.name)] : []);
    const chemins = [...fichiers('src/lib/pdf'), ...fichiers('src/pages'), ...fichiers('src/components/crm'), ...fichiers('src/components/cours-en-ligne'), ...fichiers('src/components/bpf'), ...fichiers('supabase/functions')];
    const anciens = chemins.filter(p => /823\s*461\s*561\s*000\s*18|53516371400044/.test(readFileSync(p, 'utf8')));
    expect(anciens).toEqual([]);
  });
});