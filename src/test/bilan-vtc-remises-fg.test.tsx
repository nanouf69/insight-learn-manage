import { describe,it,expect,vi } from 'vitest';
import {render,screen,waitFor,fireEvent} from '@testing-library/react';
const query=vi.hoisted(()=>({error:null as unknown,rows:[] as unknown[],ids:[] as string[]}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({select(){return this;},eq(){return this;},in(_k:string,ids:string[]){query.ids=ids;return Promise.resolve({data:query.rows,error:query.error});}})}}));
import {BilanVtcComplements,projeterRemisesComplements} from '@/components/cours-en-ligne/BilanVtcComplements';
import {BilanMatiereSteps,BilanRemisesRecap} from '@/components/cours-en-ligne/BilanFuturePresentation';
const rows=[{exercice_id:'module_5_exo_505',status:'submitted',submitted_at:'2026-11-01',bonnes_reponses:29,total_questions:49},{exercice_id:'module_5_exo_506',status:'submitted',submitted_at:'2026-11-01',bonnes_reponses:30,total_questions:46},{exercice_id:'module_5_revision_exo_505',status:'in_progress',bonnes_reponses:0,total_questions:49}];
const ae=[{submitted:true,correct:93,total:114},{submitted:true,correct:128,total:200},{submitted:true,correct:206,total:249},{submitted:false},{submitted:false}];
describe('remises F/G originales uniquement',()=>{
 it('conserve 29/49 et 30/46 sans remplacer par la révision en cours',()=>{
  const s=projeterRemisesComplements(rows);expect(s.rows[505]).toEqual({submitted:true,correct:29,total:49});expect(s.rows[506]).toEqual({submitted:true,correct:30,total:46});
 });
 it('ne transforme ni brouillon ni absence de date en remise',()=>{
  expect(projeterRemisesComplements([{...rows[0],submitted_at:null}]).rows[505].submitted).toBe(false);
  expect(projeterRemisesComplements([{...rows[0],status:'in_progress'}]).rows[505].submitted).toBe(false);
 });
 it('conserve zéro réel et refuse un résultat incohérent ou une identité en double',()=>{
  expect(projeterRemisesComplements([{...rows[0],bonnes_reponses:0}]).rows[505].correct).toBe(0);
  expect(projeterRemisesComplements([{...rows[0],bonnes_reponses:50}]).rows[505].correct).toBeNull();
  expect(projeterRemisesComplements([rows[0],rows[0]]).state).toBe('error');
 });
 it('lit seulement les originaux et conserve clic F puis G et retour',async()=>{
  query.rows=rows;query.error=null;
  render(<BilanVtcComplements apprenantId="fictif" future={<><BilanMatiereSteps current={3} submitted={[true,true,true,false,false]} onSelect={()=>{}}/><BilanRemisesRecap matieres={ae}/></>} legacy={c=><p>Exercice {c?.exerciceId}</p>}/>);
  await waitFor(()=>expect(query.ids).toEqual(['module_5_exo_505','module_5_exo_506']));
  await screen.findByText(/5\/7 matières remises/);
  fireEvent.click(screen.getByText('F(V) — Développement commercial'));expect(screen.getByText('Exercice 505')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Retour au Bilan A–E'}));
  fireEvent.click(screen.getByText('G(V) — Réglementation spécifique'));expect(screen.getByText('Exercice 506')).toBeTruthy();
 });
 it('lecture refusée ne prétend pas que F/G ne sont pas remis',async()=>{
  query.error={message:'refus'};query.rows=[];
  render(<BilanVtcComplements apprenantId="fictif" future={<BilanRemisesRecap matieres={ae}/>} legacy={()=><p/>}/>);
  await screen.findByText(/F\/G : lecture indisponible/);
  expect(screen.queryByText(/5\/7 matières remises/)).toBeNull();
 });
});