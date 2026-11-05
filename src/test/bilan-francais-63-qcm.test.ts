import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const bank = JSON.parse(readFileSync('docs/bilan-francais-63-qcm-2026-11-05/candidate.json','utf8'));
const source = JSON.parse(readFileSync('docs/bilan-francais-source-2026-11-05/source-exacte.json','utf8'));
const original = JSON.parse(readFileSync('docs/bilan-francais-source-2026-11-05/corrige-jaune-original.json','utf8'));
describe('Bilan Français — décision 63 QCM', () => {
  it('ne conserve que les 63 QCM originaux des neuf premiers textes', () => {
    const wanted = source.questions.filter((q: any) => q.texte_numero >= 1 && q.texte_numero <= 9 && q.type_explicite === 'QCM');
    expect(bank).toHaveLength(63);
    expect(bank.map((q: any) => q.sourceNumber)).toEqual(wanted.map((q: any) => q.numero));
    expect(bank.every((q: any) => q.type === 'QCM')).toBe(true);
    expect(bank.map((q: any) => q.sourceNumber)).not.toContain(80);
  });
  it('chaque texte contient sept QCM et le support exact', () => {
    for (let n=1;n<=9;n++) {
      const group=bank.filter((q: any)=>q.support.numero===n);
      expect(group).toHaveLength(7);
      for (const q of group) expect(q.support).toEqual(source.textes.find((t: any)=>t.numero===n));
    }
  });
  it('énoncés exacts et identifiants historiques conservés, pas de renumérotation de stockage', () => {
    for (const q of bank) {
      expect(q.enonce).toBe(q.sourceNumber === 33 ? 'Pour Maria Lopez, les clientes de VTC ou Taxi prennent plus facilement des « Pink ladies cab» :' : source.questions.find((s: any)=>s.numero===q.sourceNumber).enonce);
      expect(q.id).toBe(q.sourceNumber < 80 ? q.sourceNumber : q.sourceNumber - 1);
    }
  });
  it('Q14 A+C selon décision confirmée', () => {
    const q=bank.find((q: any)=>q.sourceNumber===14);
    expect(q.choix.filter((c: any)=>c.correct).map((c: any)=>c.lettre)).toEqual(['A','C']);
    expect(q.choix[2].texte).toBe('Les régions ont investi dans les TER');
  });
  it('Q15 est QCM, A+C et énoncé ambigu intact', () => {
    const q=bank.find((q: any)=>q.sourceNumber===15);
    expect(original[14].type).toBe('QCM');
    expect(q.enonce).toBe('Les régions ont investi dans les TER');
    expect(q.choix.filter((c: any)=>c.correct).map((c: any)=>c.lettre)).toEqual(['A','C']);
  });
  it('Q87 A+C avec C exact et B intact', () => {
    const q=bank.find((q: any)=>q.sourceNumber===87);
    expect(q.id).toBe(86);
    expect(q.choix[1].texte).toBe("Elle se sera débarrassée de l'électricité pour se déplacer");
    expect(q.choix[2].texte).toBe("Pour se mouvoir elle utilisera l'électricité");
    expect(q.choix.filter((c: any)=>c.correct).map((c: any)=>c.lettre)).toEqual(['A','C']);
  });
  it('toutes les autres clés proviennent exactement des passages jaunes', () => {
    for(const q of bank.filter((q: any)=>![14,15,87].includes(q.sourceNumber))) {
      expect(q.choix.map((c: any)=>c.texte)).toEqual(q.sourceNumber === 33 ? original[32].propositions.slice(1) : original[q.sourceNumber-1].propositions);
      expect(q.choix.filter((c: any)=>c.correct).map((c: any)=>c.texte)).toEqual(original[q.sourceNumber-1].jaunes);
    }
  });
});