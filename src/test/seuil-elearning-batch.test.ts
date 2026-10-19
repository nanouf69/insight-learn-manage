import { beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({tables:{} as Record<string,any[]>,calls:[] as string[],fail:''}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'admin-fictif'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
  state.calls.push(table);
  let ids:string[]|null=null;let field='';let from=0;let to=999;
  const builder:any={select:()=>builder,order:()=>builder,eq:()=>builder,in:(f:string,v:string[])=>{field=f;ids=v;return builder;},range:(f:number,t:number)=>{from=f;to=t;return builder;},then:(resolve:any)=>Promise.resolve({data:(state.tables[table]??[]).filter(r=>!ids||ids.includes(r[field])).slice(from,to+1),error:state.fail===table?new Error('Lecture échouée'):null}).then(resolve)};
  for(const method of ['insert','update','upsert','delete'])builder[method]=()=>{throw new Error('Écriture interdite');};
  return builder;
}}}));
import { chargerSeuilsElearningCRM } from '@/hooks/useSeuilsElearningCRM';
import { elearningHoursEvidence } from '@/lib/elearningHoursEvidence';
describe('Lecture groupée exacte du filtre',()=>{
  beforeEach(()=>{state.calls=[];state.fail='';state.tables={};});
  it('81 dossiers : deux lots, pas 81 lectures de fiche ; mêmes preuves et heures',async()=>{
    state.tables.apprenants=Array.from({length:81},(_,i)=>({id:String(i),type_apprenant:'vtc-e',heures_elearning:60}));
    const activities=[{id:'a',apprenant_id:'0',module_nom:'Cours',action_type:'open_module',occurred_at:'2026-10-19T08:30:00Z'}];
    const connections=[{id:'c',apprenant_id:'0',started_at:'2026-10-19T08:00:00Z',ended_at:'2026-10-19T09:00:00Z',last_seen_at:'2026-10-19T09:00:00Z'}];
    state.tables.apprenant_module_activites=activities;state.tables.apprenant_connexions=connections;
    const result=await chargerSeuilsElearningCRM(state.tables.apprenants.map(r=>r.id));
    const shared=elearningHoursEvidence({apprenantId:'0',apprenant:state.tables.apprenants[0],acts:activities,cnxAll:connections,quizzes:[],exos:[],pratiqueDates:[]});
    expect(result['0']).toMatchObject({etat:'non_atteint',fait:shared.onlineMin/60,restant:29});
    expect(state.calls.filter(t=>t==='apprenants')).toHaveLength(2);
    expect(state.calls.filter(t=>t==='apprenant_connexions')).toHaveLength(2);
    expect(Object.keys(result)).toHaveLength(81);
  });
  it('erreur de lecture d’un lot : indisponible, jamais zéro',async()=>{
    state.tables.apprenants=[{id:'a',type_apprenant:'vtc-e',heures_elearning:60}];state.fail='apprenant_connexions';
    expect(await chargerSeuilsElearningCRM(['a'])).toEqual({a:{etat:'indisponible'}});
  });
  it('pratique exclue dans réservation et attente : mêmes dates que la fiche',async()=>{
    state.tables.apprenants=[{id:'a',type_apprenant:'vtc-e',heures_elearning:60}];
    state.tables.apprenant_module_activites=[{id:'act',apprenant_id:'a',module_nom:'Cours',action_type:'open_module',occurred_at:'2026-10-19T08:30:00Z'}];
    state.tables.apprenant_connexions=[{id:'c',apprenant_id:'a',started_at:'2026-10-19T08:00:00Z',ended_at:'2026-10-19T09:00:00Z',last_seen_at:'2026-10-19T09:00:00Z'}];
    state.tables.reservations_pratique=[{id:'r',apprenant_id:'a',date_choisie:'2026-10-19',creneau:'journee'}];
    expect((await chargerSeuilsElearningCRM(['a']))['a']).toMatchObject({fait:0});
    state.tables.session_apprenants=[{id:'s',apprenant_id:'a',liste_attente:true,sessions:{type_session:'pratique',date_debut:'2026-10-19'}}];
    expect((await chargerSeuilsElearningCRM(['a']))['a']).toMatchObject({fait:1});
  });
});