import {describe,it,expect} from 'vitest';
import {lignesCanoniquesEB} from '@/lib/ebNativeDisplay';
import {statutCopieEB,libelleAttenteEB} from '@/lib/ebCanonicalStatus';
import {observerCoherenceEB} from '@/features/surveillance-examens/coherenceEB';
import {lireCurseurCoherence} from '@/features/surveillance-examens/lireCoherenceEB';
import type {CoreMatiereState} from '@/lib/coreExamPublication';
const exams=Array.from({length:6},(_,i)=>[`EB${i+1}`,`EB${i+1}-TAXI`]).flat();
const subjects=['t3p','gestion','securite','francais','anglais','reglementation','reglementation2'];
const state=(examId:string,matiereId:string,extra:Partial<CoreMatiereState>={}):CoreMatiereState=>({attemptId:`${examId}-${matiereId}`,examId,matiereId,apprenantId:'owner',finishedAt:'2026-11-13T10:00:00Z',qrcTotal:1,qrcRestantes:0,qrcProofs:[{questionId:`${matiereId}:1`,etat:'corrigee',note:12,reponse:'frozen'}],questions:[{id:`${matiereId}:1`,type:'QRC',enonce:'Frozen question',points:20}],answers:{[`${matiereId}:1`]:'frozen'},status:'definitif',pending:false,note20:12,publishedAt:'2026-11-13T10:01:00Z',...extra});
const def=(id:string)=>[{id,matieres:subjects.map(id=>({id,nom:id}))}];
describe('Canonical EB current views, 12 exams × seven exact subjects',()=>{
 for(const exam of exams)for(const subject of subjects)it(`${exam}/${subject}: missing receipt never hides submitted 12`,()=>{
   const s=state(exam,subject);const out=lignesCanoniquesEB([], [s],new Set(),'owner',def(exam));
   expect(out).toHaveLength(1);expect(out[0].__core.note20).toBe(12);expect(out[0].__copieSessionAttemptId).toBe(s.attemptId);expect(out[0].__statutCopieEB).toBe('definitif');
 });
 it('a newer pending copy never borrows an older definitive score',()=>{
   const old=state('EB1','t3p');const recent=state('EB1','t3p',{attemptId:'recent',finishedAt:'2026-11-13T11:00:00Z',qrcRestantes:1,pending:true,status:'provisoire',note20:7,qrcProofs:[{questionId:'t3p:1',etat:'en_attente',note:null,reponse:'frozen'}]});
   const out=lignesCanoniquesEB([], [recent,old],new Set(),'owner',def('EB1'));
   expect(out[0].__copieSessionAttemptId).toBe('recent');expect(out[0].__statutCopieEB).toBe('qrc_a_corriger');
 });
 it('divergent later receipt is review evidence but cannot mask the independent official copy',()=>{
   const s=state('EB6-TAXI','t3p');const r={id:'distinct',apprenant_id:'owner',quiz_id:s.examId,matiere_id:s.matiereId,completed_at:'2026-11-13T11:00:00Z',details:{reponses:{1:'different'}}};
   const before=JSON.stringify({s,r});const out=lignesCanoniquesEB([r],[s],new Set(),'owner',def(s.examId));
   expect(out[0].__core.note20).toBe(12);expect(out[0].__revueProvenance).toBeTruthy();expect(out[0].__recusDistincts).toEqual(['distinct']);expect(JSON.stringify({s,r})).toBe(before);
 });
 it('unknown owner, neutralised or server-excluded reset copy never lends a note',()=>{
   const s=state('EB1','t3p');expect(lignesCanoniquesEB([],[{...s,apprenantId:undefined},{...s,neutralise:true}],new Set(),'owner',def('EB1'))).toEqual([]);
   expect(lignesCanoniquesEB([],[],new Set(),'owner',def('EB1'))).toEqual([]);
 });
 it('same finish uses stable immutable id, not correction timestamp',()=>{
   const s=state('EB1','t3p');const a={...s,attemptId:'a',note20:7};const z={...s,attemptId:'z',note20:0};
   for(const list of [[a,z],[z,a]])expect(lignesCanoniquesEB([],list,new Set(),'owner',def('EB1'))[0].__core.note20).toBe(0);
 });
 it('failed global read does not publish a remembered legacy grade',()=>{
   const rows=[{id:'r',apprenant_id:'owner',quiz_id:'EB1',matiere_id:'t3p',note_sur_20:20}];
   expect(lignesCanoniquesEB(rows,null,null,'owner',def('EB1'))[0].__core.lectureImpossible).toBe(true);
 });
 it('QRC complete but publication absent is not pending correction',()=>{
   const s=state('EB1','t3p',{status:'provisoire',pending:true,publishedAt:null});
   expect(statutCopieEB(s)).toBe('publication');expect(libelleAttenteEB([{__core:s}])).toBe('Publication en attente');
 });
 it('missing/duplicate snapshot proof is review, not technical zero',()=>{
   for(const s of [state('EB1','t3p',{questions:[]}),state('EB1','t3p',{qrcProofs:[]}),state('EB1','t3p',{qrcProofs:[{questionId:'t3p:2',etat:'corrigee',note:12,reponse:'frozen'}]})]){
     expect(statutCopieEB(s)).toBe('revue');expect(lignesCanoniquesEB([],[s],new Set(),'owner',def('EB1'))[0].__core.lectureImpossible).toBe(true);
   }
 });
 it('report exposes ids/status only, never answers or pedagogical text',()=>{
   const s=state('EB1','t3p');const alerts=observerCoherenceEB({owner:'owner',nom:'Candidate',rows:[],states:[s],drafts:[],definitions:def('EB1'),rejected:new Set()});
   expect(alerts.map(a=>a.type)).toEqual(['recu_absent']);expect(JSON.stringify(alerts)).not.toContain('Frozen question');expect(JSON.stringify(alerts)).not.toContain('frozen');
 });
});
describe('Complete sequential diagnostic pagination',()=>{
 it('reads 205 entries in three stable pages',async()=>{
   const all=Array.from({length:205},(_,i)=>({id:String(i).padStart(4,'0')}));let calls=0;
   const rows=await lireCurseurCoherence(async cursor=>{calls++;return {data:all.filter(r=>!cursor||r.id>cursor).slice(0,100),error:null};},'id');
   expect(rows).toHaveLength(205);expect(calls).toBe(3);
 });
 it('rejects page failure rather than returning first 100 entries',async()=>{
   await expect(lireCurseurCoherence(async c=>c?{data:null,error:'offline'}:{data:Array.from({length:100},(_,i)=>({id:String(i).padStart(4,'0')})),error:null},'id')).rejects.toThrow();
 });
 it('rejects duplicate cursor page and abort',async()=>{
   const data=Array.from({length:100},(_,i)=>({id:String(i).padStart(4,'0')}));await expect(lireCurseurCoherence(async()=>({data,error:null}),'id')).rejects.toThrow();
   const ctrl=new AbortController();ctrl.abort();await expect(lireCurseurCoherence(async()=>({data:[],error:null}),'id',ctrl.signal)).rejects.toThrow('annulée');
 });
});