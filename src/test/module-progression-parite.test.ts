import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/sessionRpc', () => ({ freshSessionRead: async (call: () => unknown) => call() }));
import { projeterProgressionConfirmee } from '@/lib/moduleProgressionReadModel';
import { compterQuizModule } from '@/lib/moduleQuizCounter';
import { completionEvidenceAllowsDone } from '@/lib/moduleCompletionEvidence';
import { computeServerCompletedModuleIds, computeUnlockState, getLearnerModuleDisplayState } from '@/lib/moduleUnlockLogic';

const date = '2026-09-17T10:36:23Z';
const row = { module_id: 2, status: 'completed', completed_at: date, score_obtenu: 102, score_max: 819,
  details: Array.from({length:15}, (_,i) => ({exerciceId:i+1,questionId:1,reponseEleve:i<2?['A']:null})) };
const state = (complete: boolean | null) => new Map([[2, {module_id:2,status:'completed',completed_at:date,
  questions_requises:15,questions_prouvees:complete?15:2,preuve_complete:complete,status_effectif:complete?'completed':'in_progress',progress_effectif:complete?100:13}]]);
const proof = (i:number) => ({apprenant_id:'owner',exercice_id:`module_2_exo_${i}`,status:'submitted',submitted_at:date,reponses:{[`${i}-1`]:['B']}});

describe('Module 2 : parité des preuves admin/élève sans mutation', () => {
  it('BENTAYEB : 839/839 serveur + 12/15 quiz = réalisé et module 3 accessible', () => {
    const original = {...row, score_obtenu:45, score_max:842, details:row.details.map((d,i)=>({...d,reponseEleve:i<12?['B']:null}))};
    const before = JSON.stringify(original);
    const states = new Map([[2,{module_id:2,status:'completed',completed_at:date,questions_requises:839,questions_prouvees:839,preuve_complete:true,status_effectif:'completed',progress_effectif:100}]]);
    const admin = projeterProgressionConfirmee([original],'owner',states,[]);
    const learner = projeterProgressionConfirmee([original],'owner',states,[]);
    const stats = compterQuizModule(learner,[]);
    expect(stats).toMatchObject({completedQuizzes:12,totalQuizzes:15});
    expect(learner).toEqual(admin);
    const done = computeServerCompletedModuleIds(learner,{},n=>n);
    expect(getLearnerModuleDisplayState({loaded:true,serverCompleted:done.has(2),obligationsComplete:completionEvidenceAllowsDone(learner[0]),quizStats:stats,hasProgress:true})).toMatchObject({status:'termine',isDone:true,locked:false});
    expect(computeUnlockState({modules:[{id:2},{id:3}],completedModuleIds:done,moduleQuizStatsById:{2:stats},examBlancStatsById:{},isElearning:true}).unlockedModuleIds.has(3)).toBe(true);
    expect(JSON.stringify(original)).toBe(before);
  });
  it('838/839 réellement prouvées + 12/15 ne débloquent pas le suivant', () => {
    const states = new Map([[2,{module_id:2,status:'completed',completed_at:date,questions_requises:839,questions_prouvees:838,preuve_complete:false,status_effectif:'in_progress',progress_effectif:99}]]);
    const projected = projeterProgressionConfirmee([row],'owner',states,[]);
    const done = computeServerCompletedModuleIds(projected,{},n=>n);
    expect(done.has(2)).toBe(false);
    expect(computeUnlockState({modules:[{id:2},{id:3}],completedModuleIds:done,moduleQuizStatsById:{2:{completedQuizzes:12,totalQuizzes:15}},examBlancStatsById:{},isElearning:true}).unlockedModuleIds.has(3)).toBe(false);
  });
  it('une nouvelle lecture 839/839 remplace le faux état 657/842 sans mutation', () => {
    const before = JSON.stringify(row);
    const ancienneLecture = new Map([[2,{module_id:2,status:'completed',completed_at:date,questions_requises:842,questions_prouvees:657,preuve_complete:false,status_effectif:'in_progress',progress_effectif:78}]]);
    expect(computeServerCompletedModuleIds(projeterProgressionConfirmee([row],'owner',ancienneLecture,[]),{},n=>n).has(2)).toBe(false);
    const lectureCorrigee = new Map([[2,{module_id:2,status:'completed',completed_at:date,questions_requises:839,questions_prouvees:839,preuve_complete:true,status_effectif:'completed',progress_effectif:100}]]);
    expect(computeServerCompletedModuleIds(projeterProgressionConfirmee([row],'owner',lectureCorrigee,[]),{},n=>n).has(2)).toBe(true);
    expect(JSON.stringify(row)).toBe(before);
  });
  it('2/15 obligations réellement prouvées ne peut pas être terminé', () => {
    const projected=projeterProgressionConfirmee([row],'owner',state(false),[]);
    const stats=compterQuizModule(projected,[]);
    expect(stats).toMatchObject({completedQuizzes:2,totalQuizzes:15});
    expect(computeServerCompletedModuleIds(projected,{},n=>n).has(2)).toBe(false);
    expect(getLearnerModuleDisplayState({loaded:true,serverCompleted:true,hasProgress:true,obligationsComplete:completionEvidenceAllowsDone(projected[0]),quizStats:stats}).isDone).toBe(false);
  });
  it.each([0,2,15])('%s/15 remises : admin et élève ont le même verdict', count => {
    const original={...row,status:count===15?'completed':'in_progress',details:row.details.map(d=>({...d,reponseEleve:null}))};
    const states=state(count===15); const s=states.get(2); if(s) s.status=original.status;
    const proofs=Array.from({length:count},(_,i)=>proof(i+1));
    const admin=projeterProgressionConfirmee([original],'owner',states,proofs);
    const learner=projeterProgressionConfirmee([original],'owner',states,proofs);
    const current=row.details.map(d=>({id:String(d.exerciceId),label:String(d.exerciceId),questionIds:['1']}));
    expect(compterQuizModule(admin,current).completedQuizzes).toBe(count);
    expect(compterQuizModule(learner,current)).toEqual(compterQuizModule(admin,current));
    expect(computeServerCompletedModuleIds(admin,{},n=>n).has(2)).toBe(count===15);
  });
  it('15 soumissions corrigent le compteur figé 2/15 sans toucher notes/dates/réponses', () => {
    const before=JSON.stringify(row);
    const projected=projeterProgressionConfirmee([row],'owner',state(true),Array.from({length:15},(_,i)=>proof(i+1)));
    expect(compterQuizModule(projected,[])).toMatchObject({completedQuizzes:15,totalQuizzes:15});
    expect(projected[0]).toMatchObject({score_obtenu:102,score_max:819,completed_at:date});
    expect(JSON.stringify(row)).toBe(before);
  });
  it('autre compte, brouillons et révisions ne complètent aucun quiz', () => {
    const invalid=[{...proof(3),apprenant_id:'other'},{...proof(4),status:'in_progress'},{...proof(5),exercice_id:'module_2_revision_exo_5'},{...proof(6),exercice_id:'module_10_exo_6'}];
    expect(compterQuizModule(projeterProgressionConfirmee([row],'owner',state(false),invalid),[]).completedQuizzes).toBe(2);
  });
  it('une preuve absente ou périmée refuse le repli vers completed', () => {
    expect(()=>projeterProgressionConfirmee([row],'owner',new Map(),[])).toThrow('synchronisation');
    const states=state(true);const s=states.get(2);if(s)s.completed_at='2026-11-13T00:00:00Z';
    expect(()=>projeterProgressionConfirmee([row],'owner',states,[])).toThrow('synchronisation');
  });
  it('dispense historique : ajouts ultérieurs hors périmètre, pas de remise inventée', () => {
    const original={...row,details:row.details.slice(0,2)};
    const projected=projeterProgressionConfirmee([original],'owner',state(true),[]);
    expect(compterQuizModule(projected,[{id:'16',label:'Ajout',questionIds:['1']}])).toMatchObject({completedQuizzes:2,totalQuizzes:2});
    expect(completionEvidenceAllowsDone(projected[0])).toBe(true);
  });
});