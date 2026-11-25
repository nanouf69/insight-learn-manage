import { describe, expect, it } from 'vitest';
import { genererContactsEleves, telephoneContact } from '@/lib/contactsElevesVcf';

const eleve = { id: 'eleve-1', prenom: 'Prénom', nom: 'Nom', telephone: '06 12 34 56 78', email: 'test@example.invalid' };
describe('Contacts élèves iPhone', () => {
  it('exports displayed full name with Élève and the existing normalized phone', () => {
    const r = genererContactsEleves([eleve]);
    expect(r.nombre).toBe(1);
    expect(r.vcf).toContain('FN:Prénom Nom – Élève\r\n');
    expect(r.vcf).toContain('N:Nom – Élève;Prénom;;;\r\n');
    expect(r.vcf).toContain('TEL;TYPE=VOICE:+33612345678\r\n');
    expect(r.vcf).not.toContain('EMAIL:');
  });
  it('ignores absent, invalid, ambiguous multi-number input and missing identity', () => {
    const r = genererContactsEleves([
      { ...eleve, id: '1', telephone: null }, { ...eleve, id: '2', telephone: '123' },
      { ...eleve, id: '3', telephone: '06 12 34 56 78 / 07 12 34 56 78' }, { ...eleve, id: '4', prenom: '' },
    ]);
    expect(r.nombre).toBe(0); expect(r.ignores).toHaveLength(4); expect(r.vcf).toBe('');
  });
  it('exports at most one contact per dossier ID', () => {
    const r = genererContactsEleves([eleve, eleve]);
    expect(r.nombre).toBe(1); expect(r.ignores).toHaveLength(1);
  });
  it('deduplicates identical numbers only with matching identity evidence', () => {
    const r = genererContactsEleves([eleve, { ...eleve, id: 'reinscription', telephone: '+33 6 12 34 56 78' }]);
    expect(r.nombre).toBe(1); expect(r.ignores[0].motif).toBe('Même élève et même numéro déjà exportés');
  });
  it('retains distinct learners sharing a family phone and reports them', () => {
    const r = genererContactsEleves([eleve, { ...eleve, id: '2', prenom: 'Autre', email: 'autre@example.invalid' }]);
    expect(r.nombre).toBe(2); expect(r.partages).toHaveLength(1); expect(r.ignores).toHaveLength(0);
  });
  it('does not merge homonyms without common account or email proof', () => {
    const r = genererContactsEleves([{ ...eleve, email: null }, { ...eleve, id: '2', email: null }]);
    expect(r.nombre).toBe(2); expect(r.partages).toHaveLength(1);
  });
  it('reads all input dossiers beyond CRM display and page limits', () => {
    const rows = Array.from({ length: 1201 }, (_, i) => ({ ...eleve, id: `${i}`, prenom: `Élève ${i}`, email: `${i}@example.invalid` }));
    expect(genererContactsEleves(rows).nombre).toBe(1201);
  });
  it('validates international formats and rejects placeholder phones', () => {
    expect(telephoneContact('0033 (0)6 12 34 56 78')).toBe('+33612345678');
    expect(telephoneContact('+44 20 7946 0018')).toBe('+442079460018');
    expect(telephoneContact('0000000000')).toBeNull();
  });
  it('escapes vCard delimiters and folds long Unicode names safely', () => {
    const r = genererContactsEleves([{ ...eleve, nom: 'É'.repeat(90) + ';,\\\nTEL:evil' }]);
    expect(r.vcf).not.toContain('\r\nTEL:evil');
    expect(r.vcf).toContain('\\;\\,\\\\\\nTEL:evil');
    expect(r.vcf.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75)).toBe(true);
  });
});