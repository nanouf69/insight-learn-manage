import {describe,it,expect} from 'vitest';
import {calculerAccesCours} from '@/lib/accesCoursFenetre';
import {creneauxSessionInscrite} from '@/lib/emargementSessionSlots';
describe('Inscription VTC novembre sans réécriture des anciennes dates',()=>{
 it('Bekkis : ancienne fenêtre janvier conservée, inscription novembre autorise les cours',()=>{
  const a={date_debut_cours_en_ligne:'2026-01-12',date_fin_cours_en_ligne:'2026-01-25',date_debut_formation:'2026-11-02',date_fin_formation:'2027-01-02'};
  const before=JSON.stringify(a);
  expect(calculerAccesCours({apprenant:a,isFC:false,isPresentiel:true,fenetreSession:{date_debut:'2026-11-02',date_fin:'2026-11-13'},maintenant:new Date(2026,10,2)}).autorise).toBe(true);
  expect(JSON.stringify(a)).toBe(before);
 });
 it('VTC inscrit novembre :20 créneaux même avec ancien marqueur en ligne ; autre session reste exclue',()=>{
  const row={session_id:'91f00853-2ac2-4da6-996b-4832fc132b6b',elearning_apprenant:true,sessions:{type_session:'theorique',date_debut:'2026-11-02',date_fin:'2026-11-13'}};
  expect(creneauxSessionInscrite(row,'VTC')).toHaveLength(20);
  expect(creneauxSessionInscrite({...row,session_id:'autre'},'VTC')).toHaveLength(0);
  expect(creneauxSessionInscrite(row,'TA')).toHaveLength(0);
 });
});