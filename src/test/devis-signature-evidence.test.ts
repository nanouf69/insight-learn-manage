import { describe, it, expect } from 'vitest';
import { devisSignatureEvidence } from '@/lib/devisSignatureEvidence';

describe('Preuve de devis signé propre au candidat', () => {
  it('un devis sans signature est non signé', () => expect(devisSignatureEvidence({})).toBe('non_signe'));
  it('un statut seul ne confirme pas une signature', () => expect(devisSignatureEvidence({ statut: 'signe' })).toBe('a_verifier'));
  it('une date seule ne confirme pas une signature', () => expect(devisSignatureEvidence({ signed_at: '2026-11-20T10:00:00Z' })).toBe('a_verifier'));
  it('un PDF signé horodaté confirme la preuve', () => expect(devisSignatureEvidence({ devis_signe_url: 'signes/original.pdf', signed_at: '2026-11-20T10:00:00Z' })).toBe('signe'));
  it('la signature FC propre et sa date confirment la preuve', () => expect(devisSignatureEvidence({ signature: 'data:image/png;base64,aGVsbG8=', signed_at: '2026-11-20T10:00:00Z' })).toBe('signe'));
  it('une signature sans date ou date invalide reste à vérifier', () => {
    expect(devisSignatureEvidence({ signature: 'data:image/png;base64,aGVsbG8=' })).toBe('a_verifier');
    expect(devisSignatureEvidence({ devis_signe_url: 'original.pdf', signed_at: 'invalide' })).toBe('a_verifier');
  });
  it('un Oui ou une signature vide ne remplace pas une image', () => expect(devisSignatureEvidence({ signature: 'Oui', signed_at: '2026-11-20T10:00:00Z' })).toBe('a_verifier'));
});