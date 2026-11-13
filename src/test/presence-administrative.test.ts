import { describe,it,expect } from 'vitest';
import { fusionnerPresenceAdministrative } from '@/lib/presenceAdministrative';
import { calculerTauxPresenceHeures } from '@/components/crm/TauxPresenceSessionsCard';
import { tauxTotalPresence } from '@/lib/tauxTotalPresence';
import { computePresenceAvecAdmin } from '@/lib/presentielHours';
const admin=[{id:'h1',heures:1.5,date_presence:'2026-09-17',categorie:'theorie'}, {id:'h2',heures:4,date_presence:'2026-09-18',categorie:'theorie'}];
const ins=[{sessions:{id:'s',nom:'Session VTC cours du soir',type_session:'theorique',date_debut:'2026-09-14',date_fin:'2026-09-27'}}];
const sig=(date:string,slot:string)=>({date_emargement:date,demi_journee:slot,signature_data_url:'data:image/png;base64,AAAA'});
describe('Présence administrative live en minutes, sans écriture',()=>{
 it('1h30+4h supplémentaires donnent exactement 330 minutes',()=>expect(fusionnerPresenceAdministrative([],admin).minutesAdmin).toBe(330));
 it('33h30+5h30 supplémentaires donnent 39h/40h = 97,5%',()=>{
  const r=tauxTotalPresence({session:{faites:(2010+330)/60,prevues:40},pratique:{faites:0,prevues:0}});
  expect(r?.faites).toBe(39);expect(r?.prevues).toBe(40);expect(r?.pct).toBe(97.5);
 });
 it('17 septembre déjà signé 1h30 : pas de double comptage, ajout net 4h',()=>{
  const r=fusionnerPresenceAdministrative([{date:'2026-09-17',categorie:'theorie',minutes:90}],admin);
  expect(r.minutesAdmin).toBe(240);expect(r.revue.length).toBeGreaterThan(0);
  expect(tauxTotalPresence({session:{faites:37.5,prevues:40},pratique:{faites:0,prevues:0}})?.pct).toBe(93.75);
 });
 it('deux validations même séance sans créneau ne sont pas additionnées',()=>expect(fusionnerPresenceAdministrative([], [...admin,{...admin[1],id:'autre',heures:3}]).minutesAdmin).toBe(330));
 it('identifiant relu ne compte qu’une fois',()=>expect(fusionnerPresenceAdministrative([], [...admin,admin[0]]).minutesAdmin).toBe(330));
 it('annulation explicite ne compte pas',()=>expect(fusionnerPresenceAdministrative([], [{...admin[0],annulee:true},admin[1]]).minutesAdmin).toBe(240));
 it('une validation hors inscription reste en revue',()=>{
  const r=fusionnerPresenceAdministrative([],admin,new Set(['2026-09-17|theorie']));expect(r.minutesAdmin).toBe(90);expect(r.revue.length).toBe(1);
 });
 it('théorie ne devient jamais pratique et n’invente pas 6h prévues',()=>{
  const r=calculerTauxPresenceHeures([],ins,'vtc',[],[],admin);
  expect(r.session.faites).toBe(5.5);expect(r.session.prevues).toBe(40);expect(r.pratique.faites).toBe(0);expect(tauxTotalPresence(r)?.prevues).toBe(40);
 });
 it('les signatures vierges ne bloquent pas les heures admin',()=>{
  const end='/6n6jacAAAAGSURBVAMAsfYBgSFBzwQAAAAASUVORK5CYII=';
  const prefix='data:image/png;base64,';
  const blank=prefix+'A'.repeat(4642-prefix.length-end.length)+end;
  const r=calculerTauxPresenceHeures([{...sig('2026-09-18','soir_1'),signature_data_url:blank}],ins,'vtc',[],[],admin);
  expect(r.admin.minutesAdmin).toBe(330);
 });
 it('sessions partagées ne doublent ni durée ni preuves',()=>{
  const r=calculerTauxPresenceHeures([sig('2026-09-17','soir_1')],[ins[0],ins[0]],'vtc',[],[],admin);
  expect(r.session.prevues).toBe(40);expect(r.session.faites).toBe(5.5);expect(r.admin.minutesAdmin).toBe(240);
 });
 it('plafond théorie séparé de pratique : aucune compensation fictive',()=>expect(tauxTotalPresence({session:{faites:50,prevues:40},pratique:{faites:0,prevues:6}})?.pct).toBeCloseTo(86.9565217));
 it('projection générique élève utilise le même ajout dédoublonné',()=>{
  const r=computePresenceAvecAdmin([sig('2026-09-17','soir_1')],[],admin);expect(r.totalMinutes).toBe(330);expect(r.pratiqueMinutes).toBe(0);expect(r.admin.minutesAdmin).toBe(240);
 });
});