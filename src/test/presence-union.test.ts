import {describe,it,expect} from 'vitest';
import {unionPresence} from '@/lib/presenceUnion';
const slot=(date:string,debut:string,fin:string)=>({date,categorie:'theorie',debut,fin});
const manuel=(id:string,date:string,debut:string,fin:string)=>({...slot(date,debut,fin),id,preuve:'private.pdf'});
describe('Union des présences justifiées',()=>{
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