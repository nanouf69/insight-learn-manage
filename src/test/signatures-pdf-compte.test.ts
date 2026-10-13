import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { formaterCompteSignaturesPdf } from '@/lib/signaturesRassemblees';

describe('Compte de signatures sous le bouton PDF', () => {
  it('affiche le nombre de signatures incluses rapporté au total attendu', () => {
    expect(formaterCompteSignaturesPdf(22, 22)).toEqual({ texte: '22 signatures signées sur 22', ton: 'ok' });
    expect(formaterCompteSignaturesPdf(21, 22)).toEqual({ texte: '21 signatures signées sur 22', ton: 'partiel' });
    expect(formaterCompteSignaturesPdf(24, 22)).toEqual({ texte: '24 signatures signées sur 22', ton: 'excedent' });
  });

  it('reste au singulier pour une seule signature', () => {
    expect(formaterCompteSignaturesPdf(1, 22).texte).toBe('1 signature signée sur 22');
    expect(formaterCompteSignaturesPdf(1, null).texte).toBe('1 signature signée');
  });

  it('ne invente jamais un total : sans objectif, seul le nombre signé est affiché', () => {
    expect(formaterCompteSignaturesPdf(24, null)).toEqual({ texte: '24 signatures signées', ton: 'neutre' });
    expect(formaterCompteSignaturesPdf(24, undefined)).toEqual({ texte: '24 signatures signées', ton: 'neutre' });
    expect(formaterCompteSignaturesPdf(24, NaN)).toEqual({ texte: '24 signatures signées', ton: 'neutre' });
  });

  it('signale un total attendu indisponible au lieu d’afficher 0', () => {
    expect(formaterCompteSignaturesPdf(24, null, true)).toEqual({ texte: '24 signatures signées — total attendu indisponible', ton: 'neutre' });
  });

  it('le total attendu vient du bilan EDOF et est passé aux deux exports', () => {
    const fiche = readFileSync('src/components/crm/apprenant-sections/DocumentsCompletes.tsx', 'utf8');
    expect(fiche).toContain('totalAttendu={/e-?learning/i.test(formationEdof) ? null : (bilanEdof?.objectifTotal ?? null)}');
    expect(fiche).toContain('totalIndisponible={bilanEdofErreur}');
    const export_ = readFileSync('src/components/crm/apprenant-sections/SignaturesRassembleesExport.tsx', 'utf8');
    expect(export_).toContain('data-testid="signatures-pdf-compte"');
    expect(export_.match(/totalAttendu=\{totalAttendu\}/g)).toHaveLength(2);
  });
});
