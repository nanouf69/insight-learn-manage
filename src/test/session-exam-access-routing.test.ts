import {vi,it,expect,beforeEach} from 'vitest';
const state=vi.hoisted(()=>({opened: [] as unknown[],rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{
 from:()=>({select(){return this;},eq(){return this;},order(){return Promise.resolve({data:state.opened,error:null});}}),
 rpc:(name:string,args:unknown)=>name==='core_bridge_actif_pour'||name==='core_sujet_publie'?Promise.resolve({data:true,error:null}):state.rpc(name,args),
}}));
import {routerPassage} from '@/features/noyau-passage/pontV2';
const p={apprenantId:'fictif',examenId:'EB3',matiereId:'t3p',tentative:1,passageDejaEngage:false};
beforeEach(()=>{state.opened=[];state.rpc.mockReset();});
it('refus serveur fermé devient un message sans fallback ancien',async()=>{
 state.rpc.mockResolvedValue({error:{code:'P0551',message:'Accès à EB3 fermé pour votre session : VTC SOIR.'}});
 expect(await routerPassage(p)).toEqual({moteur:'bloque',message:'Accès à EB3 fermé pour votre session : VTC SOIR.'});
 expect(state.rpc).toHaveBeenCalledTimes(1);
});
it('épreuve déjà commencée reprend même si nouveaux départs sont fermés',async()=>{
 state.opened=[{attempt_id:'copie-commencee',snapshot:{matiere:'t3p'}}];
 expect(await routerPassage(p)).toEqual({moteur:'v2',attemptId:'copie-commencee'});
 expect(state.rpc).not.toHaveBeenCalled();
});