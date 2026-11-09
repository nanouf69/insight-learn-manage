import { describe, expect, it } from 'vitest';
import { facturePourAttestationFC, factureFCReglee } from '@/lib/factureAttestationFC';

const titre = 'Formation Continue VTC - 29 et 30 septembre 2026';
const facture = { id: 'f', session_id: 's', apprenant_id: 'a', statut: 'payee', montant_ttc: 200, numero_convention: `EXTRA::Formation continue — ${titre}` };
const select = (extras = [facture]) => facturePourAttestationFC(null, extras, 's', 'a', titre, {});
describe('Facture acquittée de formation continue', () => {
  it('reconnaît les 200 euros acquittés classés en facture additionnelle de la même formation', () => {
    expect(select()).toEqual(facture);
    expect(factureFCReglee(facture)).toBe(true);
  });
  it('refuse une prestation additionnelle indépendante', () => {
    expect(select([{ ...facture, numero_convention: 'EXTRA::Livre' }])).toBeNull();
  });
  it('refuse une autre session ou un autre apprenant', () => {
    expect(select([{ ...facture, session_id: 'autre' }])).toBeNull();
    expect(select([{ ...facture, apprenant_id: 'autre' }])).toBeNull();
  });
  it('ne considère pas un paiement partiel comme acquitté', () => {
    expect(factureFCReglee({ ...facture, statut: 'en_attente' }, [{ montant: 199 }])).toBe(false);
    expect(factureFCReglee({ ...facture, statut: 'en_attente' }, [{ montant: 200 }])).toBe(true);
  });
  it('retient la formation acquittée même si une facture principale est encore en brouillon', () => {
    expect(facturePourAttestationFC({ ...facture, id: 'draft', statut: 'brouillon' }, [facture], 's', 'a', titre, {})?.id).toBe('f');
  });
});