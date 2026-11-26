import { describe, it, expect } from 'vitest';
import { PRESTATIONS_FACTURE, notificationFacture, envoiFactureAutorise } from '@/lib/comptabilite/prestationsFacture';

describe('Prestations et notifications de facture', () => {
  it('propose les neuf formations demandées sans les confondre', () => {
    expect(PRESTATIONS_FACTURE).toEqual(['Formation VTC','Formation VTC e-learning','Formation TAXI','Formation TAXI e-learning','Formation TAXI passerelle','Formation VTC passerelle','Formation continue TAXI','Formation continue VTC','Formation mobilité TAXI']);
    expect(new Set(PRESTATIONS_FACTURE).size).toBe(9);
  });
  it('une modification référence exactement ancienne et nouvelle facture', () => {
    const n = notificationFacture({numero:'20260724001'},{numero:'20260724002',statut:'payee'});
    expect(n.annulation).toBe(false);
    expect(n.message).toContain('modifiée n° 20260724002');
    expect(n.message).toContain('remplace l’ancienne facture n° 20260724001');
  });
  it('une annulation ne présente jamais une facture de remplacement', () => {
    expect(notificationFacture({numero:'20260724001'},{numero:'20260724001',statut:'annulee'})).toEqual({sujet:'Facture annulée — 20260724001',message:'La facture n° 20260724001 est annulée.',annulation:true});
  });
  it.each(['en_cours','envoye','indetermine','echec'])('ne réenvoie pas un résultat %s', statut => expect(envoiFactureAutorise(statut)).toBe(false));
  it('seul un envoi non commencé peut être déclenché', () => expect(envoiFactureAutorise('a_envoyer')).toBe(true));
});