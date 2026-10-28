// @vitest-environment node
import { it, vi } from 'vitest';
import fs from 'fs';
const J=(f:string)=>JSON.parse(fs.readFileSync('/tmp/kev/'+f,'utf8'));
const T:any={exam_attempts_v2:J('attempts.json'),qrc_instances_v2:J('qrcs.json'),core_exam_results:J('results.json'),core_tentatives_neutralisees:J('neutres.json'),apprenant_quiz_results:J('legacy.json')};
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(t:string)=>{const q:any={select:()=>q,in:()=>q,eq:()=>q,range:async()=>({data:T[t],error:null})};return q;}}}));
import { fetchCoreMatiereStatesBulk } from '@/lib/coreExamPublication';
import { attacherSourceUnique, noteExamenAffichee } from '@/lib/noteExamenAffichee';
import { verifierPassageV2, verifierContenuPassage } from '@/lib/passagesV2NonFiables';
import { matchCoreState } from '@/lib/coreExamPublication';
import { isQrcPendingCorrection } from '@/components/cours-en-ligne/exam-helpers';
it('kevin',async()=>{
  const m=await fetchCoreMatiereStatesBulk(['5c810556-0cb4-4491-a8d7-baa7828f1d7e']);
  const st=m!.get('5c810556-0cb4-4491-a8d7-baa7828f1d7e')!;
  for(const r of T.apprenant_quiz_results.filter((r:any)=>['EB4','EB5','EB6','EB2','EB3'].includes(r.quiz_id))){
    const core=matchCoreState(st,r.quiz_id,r.matiere_id,r.completed_at,r.id,r.tentative,r.apprenant_id);
    const o=r.__preuveOriginaleDetails??r.details;
    const v=core?verifierPassageV2(core,o?.reponses??r.reponses):'-'; const c=core?verifierContenuPassage(core,o):'-';
    const n=noteExamenAffichee(attacherSourceUnique(r,st,new Set()));
    console.log(r.quiz_id,r.matiere_id,'t'+r.tentative,'core',core?core.note20:'none','verif',v,c,'legacyPending',isQrcPendingCorrection(r.details),'=>',n.etat,n.note20,n.source);
  }
});
