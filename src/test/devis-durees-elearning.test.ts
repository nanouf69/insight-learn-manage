// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { dureeDevisElearning, formationDevisAvecDuree, dureeDevisEnregistre, parcoursDevisElearning } from '@/lib/devisDureesElearning';
import { buildCanonicalDevisPDF } from '@/lib/pdf/devis-canonical';

describe('Durées affichées des nouveaux devis e-learning', () => {
  it.each([
    ['vtc_elearning', 66, 'Devis_VTC_elearning.docx'],
    ['taxi_elearning_examen', 96, 'Devis_TAXI_elearning_avec_examen.docx'],
    ['ta_elearning', 36, 'Devis_Ta_elearning.docx'],
  ])('%s : total identique Word/PDF/nouveau lien, pratique non additionnée', (id, hours, file) => {
    const duree = dureeDevisElearning(id);
    expect(duree).toBe(`${hours} heures`);
    const recorded = formationDevisAvecDuree(`Formation ${id}`, id);
    expect(dureeDevisEnregistre(recorded)).toBe(`${hours} heures`);
    const docx = new Docxtemplater(new PizZip(readFileSync(`public/devis/${file}`)), {
      paragraphLoop: true, linebreaks: true, nullGetter: () => '',
    });
    docx.render({ devis_duree_totale: duree, client_nom: 'Candidat FICTIF' });
    const xml = docx.getZip().file('word/document.xml')?.asText() ?? '';
    const text = xml.replace(/<[^>]+>/g, '');
    const actual = text.match(/(?:Durée totale|Nombre d.heures)[\s ]*:[\s ]*(\d+) heures/u);
    expect(Number(actual?.[1])).toBe(hours);
    const pdf = buildCanonicalDevisPDF({
      numDevis: `FICTIF-${id}`, dateDevis: new Date('2026-10-17T10:00:00Z'), dateValidite: new Date('2026-11-17T10:00:00Z'),
      client: { nom: 'FICTIF', prenom: 'Candidat' }, typeFinancement: 'personnel',
      formation: { designation: `Formation ${id}`, duree, isElearning: true },
      lignes: [{ designation: `Formation ${id}`, quantite: 1, prixUnitaire: 100 }],
    });
    const data = pdf.output();
    expect(data.includes(`Duree : ${hours} heures`)).toBe(true);
    mkdirSync('/tmp/devis-durees-qa', { recursive: true });
    writeFileSync(`/tmp/devis-durees-qa/${id}.pdf`, Buffer.from(pdf.output('arraybuffer')));
    writeFileSync(`/tmp/devis-durees-qa/${id}.docx`, docx.getZip().generate({ type: 'nodebuffer' }));
  });
  it('VA e-learning : 36 heures comme TA (décision du 27/10/2026)', () => {
    expect(parcoursDevisElearning('va_elearning')).toBe('va');
    expect(dureeDevisElearning('va_elearning')).toBe('36 heures');
    expect(formationDevisAvecDuree('Formation VA E-learning')).toBe('Formation VA E-learning — Durée totale : 36 heures');
  });
  it('sépare le sens des passerelles sans confondre TAXI et VTC', () => {
    expect(dureeDevisElearning('Formation TAXI pour chauffeurs VTC en E-learning')).toBe('36 heures');
    expect(dureeDevisElearning('Formation VTC pour chauffeurs TAXI E-learning')).toBe('36 heures');
  });
  it('ne réinterprète pas un devis historique ni un devis présentiel/pratique', () => {
    expect(dureeDevisEnregistre('Formation VTC E-learning')).toBeUndefined();
    expect(dureeDevisElearning('vtc_complet')).toBeUndefined();
    expect(dureeDevisElearning('taxi_pratique')).toBeUndefined();
    expect(dureeDevisEnregistre('Formation VA E-learning — Durée totale : 12 heures')).toBe('12 heures');
  });
});