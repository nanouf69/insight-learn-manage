import {createRoot} from 'react-dom/client';
import {ExamCardAccess} from '@/components/sessions/acces-examens/ExamCardAccess';
import {Button} from '@/components/ui/button';
import {supabase} from '@/integrations/supabase/client';
import '@/index.css';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(new Date());
const base={type_session:'theorique',types_apprenant:['VTC'],date_debut:today,date_fin:today};
const sessions=['Ouverte','Fermée','Habituelle','Inconnue','Non installée'].map((nom,i)=>({...base,id:`fixture-${i}`,nom:`VTC ${nom}`}));
sessions.push({...base,id:'past',nom:'Session passée',date_debut:'2020-01-01',date_fin:'2020-01-02'},{...base,id:'remote',nom:'VTC e-learning'});
const fixtureStates=new Map<string,{opened:boolean|null;operation_id:string|null}>();
sessions.forEach((s,i)=>fixtureStates.set(s.id,{opened:i===2?null:i===0,operation_id:i===2?null:'fixture-op'}));
(supabase as any).rpc=async(name:string,args:any)=>{
 if(name==='admin_set_session_exam_access'&&location.search.includes('unit')){
  if(!fixtureStates.has(args.p_session_id)||args.p_exam_id!=='EB6')throw new Error('Identité fictive incorrecte');
  fixtureStates.set(args.p_session_id,{opened:args.p_opened,operation_id:args.p_operation_id});
  return {data:{operation_id:args.p_operation_id,session_id:args.p_session_id,exam_id:args.p_exam_id,opened:args.p_opened}};
 }
 if(name!=='admin_session_exam_access_context')throw new Error('Mutation interdite');
 if(args.p_session_id==='fixture-3')return {error:{message:'Lecture impossible'}};
 if(args.p_session_id==='fixture-4')return {error:{code:'PGRST202'}};
 return {data:{session_id:args.p_session_id,session_name:sessions.find(s=>s.id===args.p_session_id)?.nom,exams:[{exam_id:'EB6',...fixtureStates.get(args.p_session_id)}]}};
};
const root=document.getElementById('root');
if(root)createRoot(root).render(<main className="max-w-xl mx-auto p-4"><h1 className="text-xl font-semibold">Examen blanc N°6 — fixture</h1><Button variant="outline">Mettre en pause</Button><ExamCardAccess examId="EB6" access={{verified:!location.search.includes('learner'),sessions,catalog:[{exam_id:'EB6',module_id:35}],error:''}}/></main>);