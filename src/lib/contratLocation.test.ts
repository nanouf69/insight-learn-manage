import { describe, expect, it } from 'vitest';
import { clauseSansCaution, conditionsDepot, coordonneesFicheLocation, coordonneesLocation, detailsVehicule, pointsVehicule } from './contratLocation';
const doc = { id: 'bienvenue-fictif', apprenant_id: 'eleve-fictif', completed_at: '2026-04-30T09:56:12Z', donnees: {nom:'Sow',prenom:'Mamadou',email:'fictif@example.test',signature:'CMA-SEULEMENT',num_permis:'NE-PAS-COPIER'} };
const kia = {id:'kia-fictif',libelle:'KIA Sportage — HK-870-BF',reference:'VIN U5YPX81GBSL278919',date_debut:'2026-03-31',date_echeance:'2030-03-31'};
describe('location read-only', () => {
 it('prefills CRM identity without requiring welcome completion',()=>expect(coordonneesFicheLocation({id:'eleve-fictif',nom:'Sow',prenom:'Mamadou',email:'fictif@example.test'},'eleve-fictif')).toMatchObject({nomComplet:'Mamadou Sow',email:'fictif@example.test',telephone:'',adresse:'',dateNaissance:''}));
 it('refuses another CRM dossier',()=>expect(coordonneesFicheLocation({id:'autre',nom:'Sow'},'eleve-fictif')).toBeNull());
 it('never copies CRM signatures or licence assertions',()=>{
  const result=coordonneesFicheLocation({id:'eleve-fictif',signature:'private',num_permis:'123'},'eleve-fictif');
  expect(result).not.toHaveProperty('signature');expect(result?.numPermis).toBe('');
 });
 it('whitelists completed welcome identity and contact fields',()=>expect(coordonneesLocation(doc,'eleve-fictif')).toMatchObject({nomComplet:'Mamadou Sow',email:'fictif@example.test',adresse:'',telephone:''}));
 it('never exports the CMA signature',()=>expect(coordonneesLocation(doc,'eleve-fictif')).not.toHaveProperty('signature'));
 it('leaves every licence field empty',()=>expect(coordonneesLocation(doc,'eleve-fictif')).toMatchObject({numPermis:'',dateDelivrancePermis:'',prefecturePermis:''}));
 it('rejects another learner',()=>expect(coordonneesLocation(doc,'autre')).toBeNull());
 it('rejects a draft',()=>expect(coordonneesLocation({...doc,completed_at:null},'eleve-fictif')).toBeNull());
 it('preserves exact KIA identity and dates',()=>expect(detailsVehicule(kia)).toEqual({marqueModele:'KIA Sportage',immatriculation:'HK-870-BF',vin:'U5YPX81GBSL278919',premiereImmatriculation:'2026-03-31',controleAvant:'2030-03-31'}));
 it('without deposit requests no payment or preauthorization',()=>expect(conditionsDepot(false)).toEqual({depot:0,cheque:false,preautorisation:false}));
 it('keeps the prior 500 euro cheque mode',()=>expect(conditionsDepot(true)).toEqual({depot:500,cheque:true,preautorisation:false}));
 it('a future control expiry proves neither insurance nor availability',()=>expect(pointsVehicule(kia,'2026-11-12')).toHaveLength(4));
 it('flags expiry on the actual rental period',()=>expect(pointsVehicule(kia,'2030-03-31')[0]).toContain('dépassée'));
 it('reading another vehicle never mutates existing selection',()=>{const sharan={marqueModele:'Volkswagen Sharan',immatriculation:'FL-511-KH'}; detailsVehicule(kia);expect(sharan).toEqual({marqueModele:'Volkswagen Sharan',immatriculation:'FL-511-KH'});});
});