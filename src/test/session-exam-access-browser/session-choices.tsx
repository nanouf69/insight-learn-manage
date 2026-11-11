import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ExamCardAccess} from '@/components/sessions/acces-examens/ExamCardAccess';
import {Button} from '@/components/ui/button';
import {supabase} from '@/integrations/supabase/client';
import '@/index.css';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(new Date());
const base={type_session:'theorique',types_apprenant:['VTC'],date_debut:today,date_fin:today};
const fixtures=[{...base,id:'uuid-day',nom:'VTC JOURNÉE'},{...base,id:'uuid-night',nom:'VTC SOIR'},{...base,id:'uuid-future',nom:'VTC JANVIER',date_debut:'2090-01-01',date_fin:'2090-01-15'},{...base,id:'uuid-past',nom:'SESSION TERMINÉE',date_debut:'2020-01-01',date_fin:'2020-01-02'},{...base,id:'uuid-remote',nom:'VTC e-learning'},{...base,id:'uuid-remote-future',nom:'E-learning futur',date_debut:'2090-01-01',date_fin:'2090-01-15'},{...base,id:'uuid-taxi',nom:'TAXI seulement',types_apprenant:['TA']}];
(supabase as any).rpc=async(name:string,args:any)=>{if(name!=='admin_session_exam_access_context')throw new Error('No mutation permitted');return {data:{session_id:args.p_session_id,session_name:fixtures.find(s=>s.id===args.p_session_id)?.nom,exams:[{exam_id:'EB3',opened:false,operation_id:'fixture-op'}]},error:null};};
function Fixture(){const [exclude,setExclude]=useState(false);return <main className="max-w-xl mx-auto p-4"><h1 className="text-xl font-semibold">Examens blancs — fixture</h1><ExamCardAccess examId="EB3" access={{verified:true,sessions:fixtures.filter(s=>!exclude||s.id!=='uuid-day'),catalog:[{exam_id:'EB3',module_id:35}],error:''}}/><Button variant="outline" className="mt-4" onClick={()=>setExclude(true)}>Exclure le choix fictif</Button></main>;}
const root=document.getElementById('root');if(root)createRoot(root).render(<Fixture/>);