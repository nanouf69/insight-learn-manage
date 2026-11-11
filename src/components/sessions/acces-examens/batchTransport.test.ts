import {vi,it,expect} from 'vitest';
const rpc=vi.hoisted(()=>vi.fn());
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc}}));
import {setSessionsAccess} from './transport';
const contexts=['A','B'].map(id=>({session_id:id,session_name:id,exams:[{exam_id:'EB6',opened:null,operation_id:null,changed_at:null}]}));
it('une erreur atomique ne conduit ni à un succès ni à un repli par session',async()=>{
 rpc.mockReset();rpc.mockResolvedValue({error:{message:'Session invalide'}});
 await expect(setSessionsAccess(contexts,'EB6',false,'batch')).rejects.toThrow('Session invalide');expect(rpc).toHaveBeenCalledTimes(1);
});
it('relecture complète obligatoire avant succès',async()=>{
 rpc.mockReset();rpc.mockImplementation(async(name:string,args:any)=>name==='admin_set_sessions_exam_access'?{data:{operation_id:'batch',exam_id:'EB6',opened:false,events:['A','B'].map(id=>({session_id:id,exam_id:'EB6',opened:false,operation_id:`op-${id}`}))}}:{data:{session_id:args.p_session_id,session_name:args.p_session_id,exams:[{exam_id:'EB6',opened:false,operation_id:`op-${args.p_session_id}`} ]}});
 expect(await setSessionsAccess(contexts,'EB6',false,'batch')).toHaveLength(2);expect(rpc).toHaveBeenCalledTimes(3);
});
it('retour périmé échoue malgré un reçu serveur',async()=>{
 rpc.mockReset();rpc.mockImplementation(async(name:string,args:any)=>name==='admin_set_sessions_exam_access'?{data:{operation_id:'batch',exam_id:'EB6',opened:false,events:['A','B'].map(id=>({session_id:id,exam_id:'EB6',opened:false,operation_id:`op-${id}`}))}}:{data:{session_id:args.p_session_id,exams:[{exam_id:'EB6',opened:true,operation_id:'old'}]}});
 await expect(setSessionsAccess(contexts,'EB6',false,'batch')).rejects.toThrow('non confirmé');
});