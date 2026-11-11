import { beforeEach, expect, it, vi } from "vitest";
const fixture=vi.hoisted(()=>({tables:{} as Record<string,Record<string,unknown>[]>,calls:[] as {table:string;filters:unknown[]}[]}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
 let start=0,end=999;let orderKey:string|null=null;const filters:Array<[string,string,unknown]>=[];
 const q={select:()=>q,order:(k:string)=>{orderKey=k;return q;},limit:(n:number)=>{end=start+n-1;return q;},gt:(k:string,v:unknown)=>{filters.push(['gt',k,v]);return q;},eq:(k:string,v:unknown)=>{filters.push(['eq',k,v]);return q;},in:(k:string,v:unknown[])=>{filters.push(['in',k,v]);return q;},ilike:()=>q,not:(k:string,_op:string,_v:unknown)=>{filters.push(['not',k,null]);return q;},range:(a:number,b:number)=>{start=a;end=b;return q;},then:(done:(v:unknown)=>unknown)=>{
 fixture.calls.push({table,filters});
 const rows=(fixture.tables[table]??[]).filter(r=>filters.every(([op,k,v])=>op==='eq'?r[k]===v:op==='gt'?String(r[k])>String(v):op==='in'?(v as unknown[]).includes(r[k]):r[k]!=null));
 if(orderKey)rows.sort((a,b)=>String(a[orderKey as string]).localeCompare(String(b[orderKey as string])));
 return Promise.resolve({data:rows.slice(start,Math.min(end+1,start+1000)),error:null}).then(done);
 }};return q;
}}}));
vi.mock('@/features/correction-qrc-v2/eb2Consultation',()=>({lirePassagesEb2Consultation:async()=>[],estConsultation:(id:string)=>id.startsWith('consultation:'),chargerConsultationEb2:async()=>null}));
import { chargerSessionTest,listerGroupesCrm } from '@/features/correction-qrc-v2/noyauReel';
beforeEach(()=>{fixture.tables={};fixture.calls=[];});
it('vrai lecteur menu : 1002 remises VTC/TAXI/TA/VA, brouillon exclu, toutes pages et anciennes tentatives',async()=>{
 fixture.tables.exam_attempts_v2=Array.from({length:1002},(_,i)=>({attempt_id:`t${i}`,apprenant_id:'a',exam_id:['EB3','EB3-TAXI','EB3-ta','EB3-va'][i%4],is_test:false,etat:'terminee',started_at:'2026-11-01T10:00:00Z',finished_at:'2026-11-01T10:30:00Z'}));
 fixture.tables.exam_attempts_v2.push({attempt_id:'draft',apprenant_id:'a',exam_id:'EB3',is_test:false,etat:'en_cours',started_at:'2026-11-09T10:00:00Z'});
 fixture.tables.apprenants=[{id:'a',type_apprenant:'taxi-e'}];
 const g=await listerGroupesCrm();const ids=g.flatMap(x=>x.examens.flatMap(e=>e.attemptIds));
 expect(ids).toHaveLength(1002);expect(ids).not.toContain('draft');expect(ids).toContain('t1001');
 expect(g[0].examens).toHaveLength(4);
 expect(fixture.calls.filter(c=>c.table==='exam_attempts_v2').length).toBeGreaterThan(1);
});
it('vrai chargeur : 1200 QRC pour 2 copies, aucune dernière fiche substituée, notes par ID',async()=>{
 fixture.tables.exam_attempts_v2=['full','partial'].map((id,i)=>({attempt_id:id,apprenant_id:'a',exam_id:'EB3-TAXI',is_test:false,etat:'terminee',started_at:`2026-11-0${i+1}T10:00:00Z`,snapshot:{source_historique:{result_id:id,details:{reponses:{'1':id==='full'?'réponse longue originale':'3.5 t'}}},questions:[],matieres:[]}}));
 fixture.tables.qrc_instances_v2=Array.from({length:1200},(_,i)=>({qrc_instance_id:`q${String(i).padStart(4,'0')}`,attempt_id:i<600?'full':'partial',apprenant_id:'a',question_id:String(i%600+1),reponse:i%600===0?'court':`texte${i}`,etat:'en_attente',note:null}));
 fixture.tables.apprenants=[{id:'a',nom:'FICTIF',prenom:'Élève'}];
 fixture.tables.core_exam_results=[{attempt_id:'full',result_id:'r1',score:15}];
 const session=await chargerSessionTest('migre',['full','partial']);
 expect(session.qrc).toHaveLength(1200);expect(session.qrc.find(q=>q.qrc_instance_id==='q1199')).toBeTruthy();
 expect(session.qrc[0].reponseComplete).toBe('réponse longue originale');expect(session.qrc[600].reponseComplete).toBe('3.5 t');
 expect(fixture.calls.some(c=>c.table==='reponses_apprenants')).toBe(false);expect(session.resultats[0].attempt_id).toBe('full');
});
it('filtre explicitement vide ne lit jamais toutes les copies',async()=>{const r=await chargerSessionTest('migre',[]);expect(r.qrc).toHaveLength(0);expect(fixture.calls).toHaveLength(0);});

it('session ciblée : filtres apprenants serveur et aucun mélange de sessions',async()=>{
 fixture.tables.sessions=[{id:'s1',nom:'Session 1',date_debut:'2026-11-01',date_fin:'2026-11-30'},{id:'s2',nom:'Session 2',date_debut:'2026-11-01',date_fin:'2026-11-30'}];
 fixture.tables.session_apprenants=[{id:'l1',session_id:'s1',apprenant_id:'a'},{id:'l2',session_id:'s2',apprenant_id:'b'}];
 fixture.tables.apprenants=[{id:'a',type_apprenant:'vtc'},{id:'b',type_apprenant:'vtc'}];
 fixture.tables.exam_attempts_v2=['a','b'].map(id=>({attempt_id:id,apprenant_id:id,exam_id:'EB1',is_test:false,etat:'terminee',started_at:'2026-11-10T10:00:00Z',finished_at:'2026-11-10T10:30:00Z'}));
 const g=await listerGroupesCrm('migre','crm:s1');expect(g.map(g=>g.cle)).toEqual(['crm:s1']);expect(g[0].examens[0].attemptIds).toEqual(['a']);
 expect(fixture.calls.filter(c=>['exam_attempts_v2','apprenant_quiz_results'].includes(c.table)).every(c=>(c.filters as string[][]).some(f=>f[0]==='in'&&f[1]==='apprenant_id'))).toBe(true);
});
