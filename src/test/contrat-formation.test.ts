import { describe, it, expect } from 'vitest';
import { CONTRACT_FIELD_GROUPS, validateContract, parisDay, deliveredValue, contractAccess, earliestContractStart, type TrainingContract } from '@/lib/contratFormation/model';
import { fundingFromLearner, newTrainingContract, contractProgramme } from '@/lib/contratFormation/prefill';
import { buildTrainingContractPdf } from '@/lib/contratFormation/pdf';
const now = new Date('2026-10-17T09:02:00Z');
function complete(): TrainingContract {
  const fields = Object.fromEntries(CONTRACT_FIELD_GROUPS.flatMap(g=>g.fields.map(([key])=>[key,'Référence fictive vérifiée'])));
  Object.assign(fields, {start:'2026-11-02',end:'2026-11-10',totalHours:'6',presenceHours:'0',distanceHours:'0',practiceHours:'6',price:'100',priceHT:'100',vatRate:'0',vatAmount:'0',vat:'Article 261 CGI — référence fictive',headcount:'3',conclusionMode:'sur place'});
  return {reference:'FICTIF',learnerId:'fictif-A',sessionId:'session-A',pathway:'pratique-taxi',funding:'personnel',fields,activities:[{id:'p',title:'Pratique TAXI',activities:'Conduite',modality:'Présentiel pratique',hours:'6',evaluation:'Mise en situation',value:'100'}],payments:[{amount:'30',date:'2026-11-01',milestone:'Après délai'},{amount:'20',date:'2026-11-02',milestone:'Début'},{amount:'20',date:'2026-11-05',milestone:'Milieu'},{amount:'30',date:'2026-11-10',milestone:'Fin'}],verified:true,concludedAt:null,signedAt:null};
}
describe('Contrat individuel — règles du modèle',()=>{
  it('jour courant Europe/Paris',()=>expect(parisDay(new Date('2026-10-17T22:30:00Z'))).toBe('2026-10-18'));
  it('distance : échéance du samedi prolongée au lundi, début mardi',()=>expect(earliestContractStart('2026-10-17','à distance')).toBe('2026-11-03'));
  it('hors établissement : échéance fériée prolongée',()=>expect(earliestContractStart('2026-10-28','hors établissement')).toBe('2026-11-13'));
  it('préparation future sans signature ni conclusion',()=>{const c=complete();expect(validateContract(c,c.learnerId,now).ready).toBe(true);expect(c.signedAt).toBeNull();expect(c.concludedAt).toBeNull();});
  it('14 jours complets : jour 14 refusé, jour 15 admis',()=>{const c=complete();c.fields.start='2026-10-31';expect(validateContract(c,c.learnerId,now).ready).toBe(false);c.fields.start='2026-11-01';expect(validateContract(c,c.learnerId,now).ready).toBe(true);});
  it.each(['2026-10-16','2026-10-17'])('formation passée %s régularisation du jour',start=>{const c=complete();c.fields.start=start;const v=validateContract(c,c.learnerId,now);expect(v.ready).toBe(false);expect(v.status).toBe('BROUILLON — RÉGULARISATION');expect(v.today).toBe('2026-10-17');});
  it.each(['','2026-02-30'])('date absente/invalide %s sans substitution',start=>{const c=complete();c.fields.start=start;expect(validateContract(c,c.learnerId,now).ready).toBe(false);});
  it('aucune signature antérieure fabriquée',()=>{const c=complete();c.signedAt='2026-10-16T10:00:00Z';expect(validateContract(c,c.learnerId,now).ready).toBe(false);});
  it('refuse autre apprenant',()=>expect(validateContract(complete(),'fictif-B',now).ready).toBe(false));
  it.each(['cpf','opco','entreprise','autre'] as const)('exclut financeur %s',funding=>{const c=complete();c.funding=funding;expect(validateContract(c,c.learnerId,now).ready).toBe(false);});
  it('CPF prime sur indication personnelle contradictoire',()=>expect(fundingFromLearner({id:'a',mode_financement:'personnel',organisme_financeur:'Caisse des Dépôts CPF'})).toBe('cpf'));
  it('financement absent doit être sélectionné',()=>expect(newTrainingContract({id:'a'}).funding).toBe(''));
  it('médiateur absent bloque document complet',()=>{const c=complete();c.fields.mediator='';expect(validateContract(c,c.learnerId,now).ready).toBe(false);expect(()=>buildTrainingContractPdf(c,now,true)).toThrow();});
  it('référence non vérifiée reste bloquante',()=>{const c=complete();c.fields.trainers='Diplômes à vérifier';expect(validateContract(c,c.learnerId,now).ready).toBe(false);});
  it('TVA et total doivent correspondre',()=>{const c=complete();c.fields.vatAmount='20';expect(validateContract(c,c.learnerId,now).ready).toBe(false);});
  it('TVA nulle exige fondement exact',()=>{const c=complete();c.fields.vat='Aucun';expect(validateContract(c,c.learnerId,now).ready).toBe(false);});
  it('aucun agrément ni TVA inventé',()=>{const c=newTrainingContract({id:'a'});expect(c.fields.approval).toBeUndefined();expect(c.fields.vat).toBeUndefined();});
  it('programme : seulement modules attribués du parcours',()=>{expect(contractProgramme({id:'a'},'taxi')).toEqual([]);expect(contractProgramme({id:'a',modules_autorises:[2,8]},'pratique-taxi')).toEqual([]);});
  it('premier versement 30 % maximum',()=>{const c=complete();c.payments[0].amount='31';c.payments[3].amount='29';expect(validateContract(c,c.learnerId,now).ready).toBe(false);});
  it('aucun paiement pendant 14 jours',()=>{const c=complete();c.payments[0].date='2026-10-31';expect(validateContract(c,c.learnerId,now).ready).toBe(false);});
  it('durées annexe identiques au total',()=>{const c=complete();c.activities[0].hours='5';expect(validateContract(c,c.learnerId,now).ready).toBe(false);});
  it('valeurs annexe identiques au prix',()=>{const c=complete();c.activities[0].value='90';expect(validateContract(c,c.learnerId,now).ready).toBe(false);});
  it('interruption seulement prestations dispensées',()=>{expect(deliveredValue(100,3,6)).toBe(50);expect(deliveredValue(100,0,6)).toBe(0);expect(()=>deliveredValue(100,7,6)).toThrow();});
  it('admin serveur et bon dossier requis',()=>{expect(contractAccess(false,'a','a')).toBe(false);expect(contractAccess(true,'a','b')).toBe(false);expect(contractAccess(true,'a','a')).toBe(true);});
  it('PDF fictif non vide paginé',()=>{const pdf=buildTrainingContractPdf(complete(),now,true);expect(pdf.getNumberOfPages()).toBeGreaterThan(3);expect(pdf.output('arraybuffer').byteLength).toBeGreaterThan(10000);});
});