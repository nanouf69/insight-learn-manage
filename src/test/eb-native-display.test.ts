import { describe, it, expect } from 'vitest';
import { lignesNativesAffichees, brouillonDejaRemis } from '@/lib/ebNativeDisplay';
import { noteExamenAffichee } from '@/lib/noteExamenAffichee';
import type { CoreMatiereState } from '@/lib/coreExamPublication';
const dates=['2026-11-13T09:59:09Z','2026-11-13T10:11:31Z'];
const state=(id:string,date:string,examId='EB6-TAXI'):CoreMatiereState=>({attemptId:id,examId,matiereId:'reglementation_taxi2',apprenantId:'learner',finishedAt:date,qrcTotal:1,qrcRestantes:0,pending:false,status:'definitif',note20:17,provenResultIds:[],questions:[{id:'reglementation_taxi2:1',type:'QRC',enonce:'Frozen',points:20}],answers:{'reglementation_taxi2:1':'Exact answer'},qrcProofs:[{questionId:'reglementation_taxi2:1',reponse:'Exact answer',etat:'corrigee',note:17}]});
const row=(examId='EB6-TAXI')=>({id:'receipt',apprenant_id:'learner',quiz_id:examId,matiere_id:'reglementation_taxi2',quiz_type:'examen_blanc',completed_at:'2026-11-13T10:11:32Z',details:{reponses:{1:'Exact answer'},qrc_pending_correction:true}});
const def=(examId:string)=>[{id:examId,matieres:[{id:'reglementation_taxi2',nom:'G(T)'}]}];
describe('Independent submitted display with colliding receipt identities',()=>{
 for(const examId of Array.from({length:6},(_,i)=>[`EB${i+1}`,`EB${i+1}-TAXI`]).flat())it(`${examId}: retains both attempts and displays latest 17, not legacy pending`,()=>{
   const states=[state('old',dates[0],examId),state('new',dates[1],examId)];const rows=[row(examId)];const before=JSON.stringify({states,rows});
   const out=lignesNativesAffichees(rows,states,new Set(),'learner',def(examId));
   expect(out[0].id).toBe('new');expect(noteExamenAffichee(out[0])).toMatchObject({etat:'note',note20:17});
   expect(out[0].details.reponses).toEqual({1:'Exact answer'});expect(states).toHaveLength(2);expect(JSON.stringify({states,rows})).toBe(before);
 });
 it('latest genuinely pending never borrows previous grade',()=>{
   const newer={...state('new',dates[1]),pending:true,status:'provisoire',qrcRestantes:1,note20:null};
   const out=lignesNativesAffichees([row()],[state('old',dates[0]),newer],new Set(),'learner',def('EB6-TAXI'));
   expect(noteExamenAffichee(out[0])).toMatchObject({etat:'en_attente',note20:null});
 });
 it('failed read and divergent receipt cannot invent a native linkage',()=>{
   const rows=[row()];expect(lignesNativesAffichees(rows,null,null,'learner',def('EB6-TAXI'))).toBe(rows);
   const divergent={...row(),details:{reponses:{1:'Different'}}};
   expect(lignesNativesAffichees([divergent],[state('new',dates[1])],new Set(),'learner',def('EB6-TAXI'))[0]).toBe(divergent);
 });
 it('exact old autosave is already submitted, no false resume',()=>{
   const draft={apprenant_id:'learner',exercice_id:'EB6-TAXI__reglementation_taxi2',updated_at:'2026-11-13T09:59:07Z',reponses:{1:'Exact answer'}};
   const states=[state('old',dates[0])];expect(brouillonDejaRemis(draft,states,'learner','EB6-TAXI')).toBe(true);
   for(const change of [{apprenant_id:'other'},{exercice_id:'EB6-TAXI__reglementation_taxi2__t2'},{updated_at:'2026-11-13T10:00:00Z'},{reponses:{1:'Changed'}},{exercice_id:'EB5-TAXI__reglementation_taxi2'}])expect(brouillonDejaRemis({...draft,...change},states,'learner','EB6-TAXI')).toBe(false);
   expect(brouillonDejaRemis(draft,null,'learner','EB6-TAXI')).toBe(false);
 });
});