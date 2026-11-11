// Real PassageMatiere; external requests must be intercepted into disposable PostgreSQL.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PassageMatiere} from '@/components/cours-en-ligne/ExamenBlancsPassage';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {startSubjectRetake,type SubjectRetakeReceipt} from '@/lib/examSubjectRetake';
import {setAnswerSaveAuthToken,setAnswerSaveOwnership} from '@/lib/answerPersistence';
import '@/index.css';
const A='11111111-1111-1111-1111-111111111111',U='22222222-2222-2222-2222-222222222222';
const exam=new URLSearchParams(location.search).get('exam')??'EB3';
const fakeSession={user:{id:U},access_token:'fictif-token-only',expires_at:9999999999};
(supabase.auth as any).getSession=async()=>({data:{session:fakeSession},error:null});
(supabase.auth as any).refreshSession=async()=>({data:{session:fakeSession},error:null});
setAnswerSaveAuthToken('fictif-token-only',U);
setAnswerSaveOwnership({apprenantId:A,previewReadOnly:false});
function Harness(){
 const [r,setR]=useState<SubjectRetakeReceipt|null>(null); const [err,setErr]=useState('');const [done,setDone]=useState(false);
 const start=async()=>{try{setR(await startSubjectRetake({owner:U,account:A,exam,subject:'t3p',sourceExercise:`${exam}__t3p`}));}catch(e){setErr(String(e));}};
 return <><Button onClick={()=>void start()}>Démarrer la matière ciblée</Button>{err&&<p role="alert">{err}</p>}{r&&!done&&<PassageMatiere matiere={r.matiere} numero={1} total={1} examenId={exam} apprenantId={A} userId={U} tentative={r.tentative} exerciceIdOverride={r.exercice_id} subjectRetake={r} onTerminer={()=>setDone(true)}/>}{done&&<p role="status">Matière remise</p>}</>;
}
const root=document.getElementById('root');if(root)createRoot(root).render(<Harness/>);
