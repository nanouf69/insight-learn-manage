import { describe, it, expect } from 'vitest';
import { organisationsDepuisFinanceurs } from '@/lib/devisOrganisationsApprenants';

const rows = [
  { id: '1', apprenant_id: 'harun', type_financeur: 'professionnel', raison_sociale: 'Sas vtc my chauffeur', siret: '83872349200016', ville: 'VENISSIEUX', email_facturation: 'h@x.fr' },
  { id: '2', apprenant_id: 'jean', type_financeur: 'professionnel', raison_sociale: 'VTC MY CHAUFFEUR SAS', siret: '83872349200016', ville: 'Vénissieux', contact_email: 'j@x.fr' },
  { id: '3', apprenant_id: 'autre', type_financeur: 'professionnel', raison_sociale: 'Alpha Taxi', siret: '11111111100011' },
  { id: '4', apprenant_id: 'perso', type_financeur: 'particulier', raison_sociale: 'Ne doit pas apparaître' },
];

describe('organisations des apprenants dans le devis', () => {
  it("met en tête l'organisation de l'apprenant ouvert et garde ses coordonnées", () => {
    const out = organisationsDepuisFinanceurs(rows, 'jean');
    expect(out[0]).toMatchObject({ id: 'fc:2', nom: 'VTC MY CHAUFFEUR SAS', email: 'j@x.fr', apprenantCourant: true });
  });
  it('une seule entrée par SIRET et aucun financeur particulier', () => {
    const out = organisationsDepuisFinanceurs(rows, 'jean');
    expect(out.map(o => o.nom)).toEqual(['VTC MY CHAUFFEUR SAS', 'Alpha Taxi']);
  });
});
