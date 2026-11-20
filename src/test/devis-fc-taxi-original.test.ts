// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import PizZip from 'pizzip';
import { injecterMontantDevisOriginal } from '@/lib/devisFcTaxiOriginal';

const xml = new PizZip(readFileSync('public/devis/Devis_formation_continue_TAXI.docx')).file('word/document.xml')!.asText();
const texte = (s: string) => s.replace(/<[^>]+>/g, '');

describe('devis FC TAXI au format original', () => {
  it('écrit 200,00 € dans la cellule montant de la ligne Formation continue TAXI', () => {
    const out = injecterMontantDevisOriginal(xml, 200);
    expect(texte(out)).toContain('Formation continue TAXI1200,00 €');
  });
  it("ne change rien d'autre que cette cellule", () => {
    const out = injecterMontantDevisOriginal(xml, 200);
    expect(out.length - xml.length).toBeLessThan(200);
    expect(texte(out).replace('200,00 €', '')).toBe(texte(xml));
  });
  it('sans prix, le modèle reste identique', () => {
    expect(injecterMontantDevisOriginal(xml, 0)).toBe(xml);
  });
});
