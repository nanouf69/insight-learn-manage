import {createRoot} from 'react-dom/client';
import {EcranSelection} from '@/components/cours-en-ligne/ExamenBlancsListe';
import {supabase} from '@/integrations/supabase/client';
import {tousLesExamens} from '@/components/cours-en-ligne/examens-blancs-data';
import '@/index.css';
// TEST ONLY: no real sign-in, immutable fake auth and server role for UI fixture.
const learner=new URLSearchParams(location.search).has('learner');
supabase.auth.getUser=async()=>({data:{user:{id:'admin-fictif'}},error:null}) as never;
const rpc=supabase.rpc.bind(supabase);
supabase.rpc=((name:string,args:unknown)=>name==='has_role'?Promise.resolve({data:!learner,error:null}):rpc(name as never,args as never)) as typeof supabase.rpc;
const root=document.getElementById('root');
if(root)createRoot(root).render(<main className="p-4"><EcranSelection isAdmin={!learner} examensData={tousLesExamens.filter(e=>e.id==='EB3')} onStart={()=>{}} onStartPartial={()=>{}} onEdit={()=>{}} onViewResults={()=>{}} onPauseToggle={()=>{}}/></main>);