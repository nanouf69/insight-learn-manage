import {describe,it,expect} from 'vitest';
import {unionPresence} from '@/lib/presenceUnion';
import {calculerTauxPresenceHeures} from '@/components/crm/TauxPresenceSessionsCard';
const slot=(date:string,debut:string,fin:string)=>({date,categorie:'theorie',debut,fin});
const manuel=(id:string,date:string,debut:string,fin:string)=>({...slot(date,debut,fin),id,preuve:'private.pdf'});
describe('Union des présences justifiées',()=>{
 it('CHERNI : 33h30 signées et 6h30 de reçus donnent 40/46, puis annulation relue',()=>{
  const ins=[{sessions:{id:'s',nom:'VTC cours du soir',type_session:'theorique',date_debut:'2026-09-14',date_fin:'2026-09-25'}}];
  const dates=['14','15','16','17','18','21','22','23','24','25'];
  const sig=dates.flatMap(j=>['soir_1','soir_2'].filter(c=>!(j==='17'&&c==='soir_2')&&j!=='18').map(c=>({date_emargement:`2026-09-${j}`,demi_journee:c,signature_data_url:'data:image/png;base64,AAAA'})));
  const liens=[['a','17','soir_2','18:30','21:00',150],['b','18','soir_1','17:00','18:30',90],['c','18','soir_2','18:30','21:00',150]].map(([id,j,c,debut,fin,minutes])=>({id:String(id),validation_id:String(id),apprenant_id:'x',date_presence:`2026-09-${j}`,creneau:String(c),debut:String(debut),fin:String(fin),minutes:Number(minutes),pdf_chemin:'private.pdf',operation_id:String(id)}));
  const rows=liens.map(l=>({id:l.id,date_presence:l.date_presence,categorie:'theorie',heures:l.minutes/60}));
  const r=calculerTauxPresenceHeures(sig,ins,'vtc',[],[],rows,true,liens);
  expect(r.signees).toBe(33.5);expect(r.manuelles).toBe(6.5);expect(r.session.faites).toBe(40);expect(r.pratique.prevues).toBe(6);expect(r.admin.revue).toEqual([]);
  const annul=calculerTauxPresenceHeures(sig,ins,'vtc',[],[],rows.filter(r=>r.id!=='c'),true,liens.filter(l=>l.id!=='c'));
  expect(annul.session.faites).toBe(37.5);
 });
 it('créneaux du 17 et 18 distincts : 390 min, pas maximum journalier',()=>{
  const p=[slot('17','17:00','21:00'),slot('18','17:00','21:00')];
  const r=unionPresence([slot('17','17:00','18:30')],[manuel('a','17','18:30','21:00'),manuel('b','18','17:00','18:30'),manuel('c','18','18:30','21:00')],p);
  expect(r.manuellesMinutes).toBe(390);expect(r.netMinutes).toBe(390);expect(r.totalMinutes).toBe(480);
 });
 it('33h30 signées +3h30 net =37h sans présumer le cas réel',()=>{
  const p=Array.from({length:10},(_,i)=>slot(String(i),'17:00','21:00'));
  const s=p.slice(0,8).concat(slot('8','17:00','18:30'));
  const r=unionPresence(s,[manuel('a','8','18:30','21:00'),manuel('b','9','17:00','18:00')],p);
  expect(r.signesMinutes).toBe(2010);expect(r.netMinutes).toBe(210);expect(r.totalMinutes).toBe(2220);
 });
 it('signature et validation du même créneau ne comptent jamais deux fois',()=>{
  const p=[slot('17','17:00','21:00')];const r=unionPresence(p,[manuel('a','17','18:30','21:00'),manuel('b','17','18:30','21:00')],p);
  expect(r.totalMinutes).toBe(240);expect(r.netMinutes).toBe(0);expect(r.manuellesMinutes).toBe(150);
 });
 it('annulation exclue et preuve absente exclue',()=>{
  expect(unionPresence([],[{...manuel('a','17','17:00','21:00'),annulee:true},{...manuel('b','17','17:00','21:00'),preuve:''}],[slot('17','17:00','21:00')]).totalMinutes).toBe(0);
 });
 it('plafond aux horaires prévus, sans comptage hors séance',()=>{
  expect(unionPresence([],[manuel('a','17','16:00','22:00')],[slot('17','17:00','21:00')]).totalMinutes).toBe(240);
 });
});