import { expect,it } from 'vitest';
import { absentsSessionJour,type PreuvesJour } from './absenceSessionJour';
const image='data:image/png;base64,YWJj';
const row=(id:string)=>({apprenant_id:id,session_id:'s',apprenants:{type_apprenant:'taxi',statut:'inscrit'},sessions:{id:'s',type_session:'theorique',nom:'TAXI',statut:'Planifiée',date_debut:'2026-10-26',date_fin:'2026-11-16',heure_debut:'09:00',heure_fin:'16:00'}});
const sig=(id:string,slot:string)=>({apprenant_id:id,demi_journee:slot,signed_at:'2026-11-11T08:00:00Z',signature_data_url:image,masque:false,absent:false});
function fixture():PreuvesJour{return {jour:'2026-11-11',jourServeur:'2026-11-11',minuteParis:18*60,inscriptions:[row('hamdi'),row('present')],signatures:[sig('present','matin'),sig('present','apres_midi')],papier:[],heures:[]};}
it('jour férié réellement dispensé : absence si tous les créneaux terminés et aucune preuve',()=>expect([...absentsSessionJour(fixture())]).toEqual([['hamdi','non_emarge']]));
it('une seule signature du jour empêche une absence certaine de journée',()=>{const p=fixture();p.signatures.push(sig('hamdi','matin'));expect(absentsSessionJour(p).has('hamdi')).toBe(false);});
it('papier documenté et heures validées même partielles empêchent absence',()=>{
 const p=fixture();p.papier.push({apprenant_id:'hamdi',heures:1,documents_inscription:{url:'preuve.pdf',statut:'valide'}});expect(absentsSessionJour(p).has('hamdi')).toBe(false);
 p.papier=[];p.heures.push({apprenant_id:'hamdi',heures:1});expect(absentsSessionJour(p).has('hamdi')).toBe(false);
});
it('sans cours prouvé ou preuve sur une seule demi-journée : ne rien afficher',()=>{const p=fixture();p.signatures=[];expect(absentsSessionJour(p).size).toBe(0);p.signatures=[sig('present','matin')];expect(absentsSessionJour(p).size).toBe(0);});
it('créneau en cours ou encore futur : ne pas affirmer une absence de journée',()=>{const p=fixture();p.minuteParis=12*60+30;expect(absentsSessionJour(p).size).toBe(0);p.minuteParis=16*60;expect(absentsSessionJour(p).size).toBe(0);});
it('lecture échouée : aucun indicateur',()=>expect(absentsSessionJour({...fixture(),erreur:true}).size).toBe(0));
it('signatures masquées/absence, papier refusé : ne prouvent ni présence ni cours',()=>{const p=fixture();p.signatures[0].masque=true;expect(absentsSessionJour(p).size).toBe(0);p.signatures=fixture().signatures;p.papier=[{apprenant_id:'hamdi',heures:3,documents_inscription:{url:'preuve.pdf',statut:'refuse'}}];expect(absentsSessionJour(p).has('hamdi')).toBe(true);});
it('attente, exclusions, distanciel et dates personnalisées sont respectés',()=>{
 for(const patch of [{liste_attente:true},{emargements_exclus:true},{date_fin_personnalisee:'2026-11-10'},{statut_suivi:'annulée'},{apprenants:{type_apprenant:'taxi-e'}}]){const p=fixture();p.inscriptions[0]={...p.inscriptions[0],...patch};expect(absentsSessionJour(p).has('hamdi')).toBe(false);}
});