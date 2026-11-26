import { describe, expect, it } from 'vitest';
import { factureDansCorbeille, snapshotCorbeille, suppressionsActives, type TraceCorbeilleFacture } from '@/lib/comptabilite/corbeilleFactures';

const facture = { id: 'facture-1', numero: '20260724002', montant_ttc: 200, statut: 'payee', apprenant_id: 'apprenant-1' };
const trace = (id: string, action: 'supprimer' | 'remettre', suppressionId?: string): TraceCorbeilleFacture => ({
  id, facture_id: facture.id, numero: facture.numero, client_nom: 'Client', montant_ttc: 200,
  date_emission: '2026-07-24', deleted_at: '2026-11-26T16:11:00Z', deleted_by_email: null, motif: null,
  snapshot: snapshotCorbeille(facture, action, suppressionId),
});

describe('Corbeille réversible des factures', () => {
  it('retire la facture 20260724002 de la liste après confirmation et la remet avec le même identifiant', () => {
    const deletion = trace('suppression-1', 'supprimer');
    expect(factureDansCorbeille(facture.id, [])).toBe(false);
    expect(factureDansCorbeille(facture.id, [deletion])).toBe(true);
    expect(factureDansCorbeille(facture.id, [deletion, trace('remise-1', 'remettre', deletion.id)])).toBe(false);
  });
  it('conserve le montant payé de 200 €, le statut et le rattachement dans les deux traces', () => {
    for (const action of ['supprimer', 'remettre'] as const) {
      expect(snapshotCorbeille(facture, action)).toMatchObject(facture);
    }
    expect(facture).toEqual({ id: 'facture-1', numero: '20260724002', montant_ttc: 200, statut: 'payee', apprenant_id: 'apprenant-1' });
  });
  it('une remise ne ferme pas une autre suppression concurrente', () => {
    const events = [trace('s1', 'supprimer'), trace('s2', 'supprimer'), trace('r1', 'remettre', 's1')];
    expect(suppressionsActives(events).map(t => t.id)).toEqual(['s2']);
    expect(factureDansCorbeille(facture.id, events)).toBe(true);
  });
  it('une remise sur une autre facture ne restaure pas celle-ci', () => {
    const remise = { ...trace('r1', 'remettre', 's1'), facture_id: 'facture-2' };
    expect(suppressionsActives([trace('s1', 'supprimer'), remise]).map(t => t.id)).toEqual(['s1']);
  });
  it('les anciennes suppressions destructives restent historiques, sans fabriquer une facture ou un paiement', () => {
    const legacy = { ...trace('legacy', 'supprimer'), snapshot: facture };
    expect(suppressionsActives([legacy])).toEqual([]);
    expect(factureDansCorbeille(facture.id, [legacy])).toBe(false);
  });
});