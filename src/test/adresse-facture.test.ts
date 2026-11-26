import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { adresseDestinataireFacture, destinataireFactureFige, factureAdresseProspective, lignesDestinataireBrouillon, adresseAcheteurFactureXml } from '@/lib/comptabilite/adresseFacture';
import { generateFactureFC } from '@/lib/pdf/facture-fc';

const stagiaire = { adresse: '1 rue du Stagiaire', code_postal: '69003', ville: 'Lyon' };
const financeur = { type_financeur: 'professionnel', raison_sociale: 'Entreprise test', adresse: '820 avenue Entreprise', code_postal: '69220', ville: 'Belleville' };
const nouvelle = { created_at: '2026-11-26T16:54:00Z', client_nom: 'Entreprise test', client_adresse: '820 avenue Entreprise, 69220 Belleville', client_siret: '11111111111111' };

describe('Adresse des prochaines factures', () => {
  it('entreprise : adresse du financeur, pas celle du stagiaire', () => {
    expect(adresseDestinataireFacture(financeur, stagiaire)).toBe('820 avenue Entreprise, 69220 Belleville');
  });
  it('sans financeur : adresse du stagiaire', () => {
    expect(adresseDestinataireFacture(null, stagiaire)).toBe('1 rue du Stagiaire, 69003 Lyon');
  });
  it('financeur particulier : adresse du stagiaire qui reçoit la facture', () => {
    expect(adresseDestinataireFacture({ ...financeur, type_financeur: 'particulier' }, stagiaire)).toBe('1 rue du Stagiaire, 69003 Lyon');
  });
  it('facture additionnelle explicitement au nom du financeur particulier : sa propre adresse', () => {
    expect(adresseDestinataireFacture({ ...financeur, type_financeur: 'particulier' }, stagiaire, { financeurParticulierDestinataire: true })).toBe('820 avenue Entreprise, 69220 Belleville');
  });
  it('entreprise incomplète : aucun mélange avec le code postal du stagiaire', () => {
    expect(adresseDestinataireFacture({ ...financeur, code_postal: null, ville: null }, stagiaire)).toBe('820 avenue Entreprise');
  });
  it('entreprise sans adresse : aucun remplacement silencieux par le domicile', () => {
    expect(adresseDestinataireFacture({ type_financeur: 'professionnel' }, stagiaire)).toBe('');
  });
  it('facture déjà créée : adresse enregistrée conservée après modification du dossier', () => {
    const preuve = JSON.parse(JSON.stringify(nouvelle));
    expect(destinataireFactureFige(preuve)).toEqual({ nom: 'Entreprise test', adresse: '820 avenue Entreprise, 69220 Belleville', siret: '11111111111111' });
    expect(preuve).toEqual(nouvelle);
  });
  it.each(['payee', 'envoyee', 'remboursee', 'cloturee'])('ancienne facture %s : adaptateur historique inchangé', statut => {
    expect(destinataireFactureFige({ ...nouvelle, created_at: '2026-11-26T16:52:59Z', statut } as typeof nouvelle)).toBeUndefined();
  });
  it('date de création absente ou illisible : historique, jamais une nouvelle facture déduite', () => {
    expect(factureAdresseProspective({})).toBe(false);
    expect(factureAdresseProspective({ created_at: 'inconnue' })).toBe(false);
  });
  it('nouvelle adresse vide : vide confirmé conservé sans repli depuis le dossier', () => {
    expect(destinataireFactureFige({ ...nouvelle, client_adresse: null })?.adresse).toBe('');
  });
  it('brouillon relu : coordonnées distinctes de la référence dossier', () => {
    const draft = JSON.parse(JSON.stringify({ client_nom: nouvelle.client_nom, client_adresse: nouvelle.client_adresse, refDossier: 'Dossier stagiaire' }));
    expect(lignesDestinataireBrouillon(draft)).toEqual(['Entreprise test', '820 avenue Entreprise, 69220 Belleville']);
  });
  it('ancien brouillon : référence héritée inchangée', () => {
    expect(lignesDestinataireBrouillon({ refDossier: 'Ancien client\nAncienne adresse' })).toEqual(['Ancien client', 'Ancienne adresse']);
  });
  it('XML prochain : adresse enregistrée exacte et échappée', () => {
    expect(adresseAcheteurFactureXml({ ...nouvelle, client_adresse: 'Rue A & B <test>' })).toBe('<ram:PostalTradeAddress><ram:LineOne>Rue A &amp; B &lt;test&gt;</ram:LineOne></ram:PostalTradeAddress>');
  });
  it('XML historique : aucune adresse ajoutée rétroactivement', () => {
    expect(adresseAcheteurFactureXml({ ...nouvelle, created_at: '2026-07-24T00:00:00Z' })).toBe('');
  });
  it.each(['VTC', 'TAXI'] as const)('PDF FC %s : coordonnées figées distinctes des coordonnées actuelles', async formation => {
    const result = await generateFactureFC({
      numero: `TEST-ADRESSE-${formation}`, dateEmission: '2026-11-27',
      apprenant: { nom: 'TEST', prenom: 'Stagiaire', ...stagiaire },
      financeur: { ...financeur, adresse: 'Adresse modifiée depuis la facture' },
      destinataireEnregistre: destinataireFactureFige(nouvelle),
      formation, designation: `Formation continue ${formation}`, montantHT: 200,
    }, { returnDoc: true });
    if (!result.doc) throw new Error('PDF absent');
    const bytes = Buffer.from(result.doc.output('arraybuffer'));
    const texte = bytes.toString('latin1');
    expect(texte).toContain('820 avenue Entreprise, 69220 Belleville');
    expect(texte).not.toContain('1 rue du Stagiaire');
    expect(texte).not.toContain('Adresse modifi');
    writeFileSync(`/tmp/adresse-facture-${formation}.pdf`, bytes);
  });
});