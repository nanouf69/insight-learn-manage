import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { formaterCompteSignaturesPdf } from '@/lib/signaturesRassemblees';
import { rassemblerSignatures } from '@/lib/signaturesRassemblees';
import { calculerBilanSignaturesEdof } from '@/lib/signaturesManquantes';

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

  it('20 signatures et 2 dates automatiques sans image : bilan et PDF comptent 20 sur 22', () => {
    const dates = ['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25'];
    const rows = dates.flatMap(d => ['matin', 'apres_midi'].map(c => ({ id: `${d}-${c}`, date_emargement: d, demi_journee: c, masque: false, signature_data_url: 'data:image/png;base64,AAA', signed_at: `${d}T07:00:00Z` })));
    const pratique = ['matin', 'apres_midi'].map(c => ({ id: `pratique-${c}`, date_emargement: '2026-10-13', demi_journee: c, masque: false, signature_data_url: '', signed_at: '2026-10-13T07:00:00Z' }));
    const source = [...rows, ...pratique];
    const avant = JSON.stringify(source);
    const sessions = [{ sessions: { type_session: 'theorique', date_debut: dates[0], date_fin: dates[9], heure_debut: '09:00', heure_fin: '16:00' } }];
    const bilan = calculerBilanSignaturesEdof(source, sessions, [{ date_choisie: '2026-10-13' }], 'VTC');
    const images = rassemblerSignatures(source, [], sessions);
    expect(bilan.total).toBe(20);
    expect(bilan.pratique).toBe(0);
    expect(bilan.complet).toBe(false);
    expect(bilan.objectifTotal).toBe(22);
    expect(images).toHaveLength(20);
    expect(formaterCompteSignaturesPdf(images.length, bilan.objectifTotal).texte).toBe('20 signatures signées sur 22');
    expect(readFileSync('src/components/crm/apprenant-sections/SignaturesRassembleesExport.tsx', 'utf8')).toContain('une date de signature sans image n’est pas reproduite');
    expect(JSON.stringify(source)).toBe(avant);
  });
});
