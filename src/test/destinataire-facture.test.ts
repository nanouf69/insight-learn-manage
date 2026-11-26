import { describe, expect, it, vi } from 'vitest';
import { destinataireFactureParDefaut as adresse, lireDestinataireFacture } from '@/lib/comptabilite/destinataireFacture';

describe('Destinataire de la facture', () => {
  it('préfère le mail de facturation du financeur au stagiaire', () => {
    expect(adresse({type_financeur:'professionnel', email_facturation:'financeur@example.fr', contact_email:'contact@example.fr'}, {email:'stagiaire@example.fr'}, 'professionnel')).toBe('financeur@example.fr');
  });
  it('utilise le contact du financeur sans mail de facturation', () => {
    expect(adresse({type_financeur:'professionnel', contact_email:'contact@example.fr'}, {email:'stagiaire@example.fr'}, 'professionnel')).toBe('contact@example.fr');
  });
  it('sans financeur utilise le stagiaire', () => {
    expect(adresse(null, {email:'stagiaire@example.fr'}, 'particulier')).toBe('stagiaire@example.fr');
  });
  it('une fiche particulier ne constitue pas un financeur', () => {
    expect(adresse({type_financeur:'particulier', contact_email:'ancien@example.fr'}, {email:'stagiaire@example.fr'}, 'particulier')).toBe('stagiaire@example.fr');
  });
  it('ne remplace pas un financeur sans adresse par le stagiaire', () => {
    expect(adresse({type_financeur:'professionnel'}, {email:'stagiaire@example.fr'}, 'professionnel')).toBe('');
  });
  it('utilise les coordonnées de facturation du dossier hors FC', () => {
    expect(adresse(null, {email:'stagiaire@example.fr', societe_nom:'Société', facture_contact_email:'societe@example.fr'}, 'professionnel')).toBe('societe@example.fr');
  });
  it('mail financeur confirmé : ne lit pas le dossier qui peut être indisponible', async () => {
    const stagiaire = vi.fn(async () => { throw new Error('Dossier indisponible'); });
    expect(await lireDestinataireFacture(async () => ({ type_financeur: 'professionnel', email_facturation: 'financeur@example.fr' }), stagiaire, 'professionnel')).toBe('financeur@example.fr');
    expect(stagiaire).not.toHaveBeenCalled();
  });
  it('sans financeur : attend la lecture du stagiaire', async () => {
    const stagiaire = vi.fn(async () => ({ email: 'stagiaire@example.fr' }));
    expect(await lireDestinataireFacture(async () => null, stagiaire, 'particulier')).toBe('stagiaire@example.fr');
    expect(stagiaire).toHaveBeenCalledTimes(1);
  });
  it('lecture du financeur refusée : ne substitue pas un mail stagiaire', async () => {
    const stagiaire = vi.fn(async () => ({ email: 'stagiaire@example.fr' }));
    await expect(lireDestinataireFacture(async () => { throw new Error('Lecture refusée'); }, stagiaire, 'professionnel')).rejects.toThrow('Lecture refusée');
    expect(stagiaire).not.toHaveBeenCalled();
  });
});