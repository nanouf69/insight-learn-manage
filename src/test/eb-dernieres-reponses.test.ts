import {describe,it,expect} from 'vitest';
import {examAttemptAnswers} from '@/lib/examAttemptAnswers';
import {ebRevisionSource} from '@/lib/ebRevisionSource';
import {revisionSourcesCompatibles} from '@/lib/revisionFaussesProgression';
import {questionsFaussesDuPassage} from '@/lib/revisionQuestionsFigees';

const question = {id:'gestion:1',type:'QCM',enonce:'Q',points:2,choix:[{lettre:'A',texte:'A',correct:true},{lettre:'B',texte:'B',correct:false}]};
const state = (id:string,end:string,answers:unknown) => ({attemptId:id,finishedAt:end,examId:'EB6-TAXI',apprenantId:'owner',matiereId:'gestion',
  answers:{'gestion:1':answers},questions:[question],pending:false,status:'definitif',qrcTotal:0,qrcRestantes:0,note20:20});
const result:any = {resultId:'r1',completedAt:'2026-10-30T09:00:00Z',matiereId:'gestion',noteObtenue:8,reponses:{1:['A']}};
describe('dernières réponses confirmées sans copie empruntée',()=>{
  it('HADDOU : la projection récente utilise ses réponses, pas la clé legacy ancienne',()=>{
    const r=ebRevisionSource(result,'EB6-TAXI','owner',[state('t1','2026-10-30T09:00:00Z',['A']),state('t2','2026-11-13T09:25:56Z',['B'])]);
    expect(r.reponses).toEqual({1:['B']}); expect(r.resultId).toBe('t2'); expect(result.reponses).toEqual({1:['A']}); expect(r.noteObtenue).toBe(8);
  });
  it('ne reprend pas une ancienne réponse si la nouvelle copie est vide',()=>{
    const empty={...state('t2','2026-11-13T09:00:00Z',['A']),answers:{}};
    expect(ebRevisionSource(result,'EB6-TAXI','owner',[empty]).reponses).toEqual({});
  });
  it('refuse un reçu legacy plus récent sans lien immutable au lieu de deviner',()=>{
    expect(()=>ebRevisionSource({...result,completedAt:'2026-11-13T09:25:57Z'},'EB6-TAXI','owner',[state('t2','2026-11-13T09:25:56Z',['A'])])).toThrow('revue manuelle');
  });
  it('refuse doublon question, autre matière et snapshot sans identités',()=>{
    expect(()=>examAttemptAnswers('gestion',['gestion:1'],[{question_id:'gestion:1',valeur:'a'},{question_id:'gestion:1',valeur:'b'}])).toThrow();
    expect(()=>examAttemptAnswers('gestion',['gestion:1'],[{question_id:'anglais:1',valeur:'a'}])).toThrow();
    expect(()=>examAttemptAnswers('gestion',[],[])).toThrow();
  });
  it('même numéro de question ne permet pas de reprendre un brouillon d’une autre copie',()=>{
    const saved={revisionState:{sourceResultIds:{'gestion:1':'t1'}}};
    expect(revisionSourcesCompatibles(saved,{'gestion:1':'t2'})).toBe(false);
    expect(revisionSourcesCompatibles(saved,{'gestion:1':'t1'})).toBe(true);
    expect(revisionSourcesCompatibles({}, {'gestion:1':'t2'})).toBe(false);
  });
  it('EB1–EB6 TAXI/VTC : isolement compte, examen, matière, ancienne copie conservée',()=>{
    for(const exam of Array.from({length:6},(_,i)=>`EB${i+1}`).flatMap(e=>[e,`${e}-TAXI`])){
      const latest={...state('new','2026-11-13T09:00:00Z',['B']),examId:exam};
      const r=ebRevisionSource(result,exam,'owner',[latest,{...latest,apprenantId:'other',finishedAt:'2026-11-14T00:00:00Z'}]);
      expect(r.reponses).toEqual({1:['B']}); expect(r.resultId).toBe('new');
    }
  });
  it('corrigé actuel prouvé modifié : classement révision distinct sans modifier la copie',()=>{
    const r=ebRevisionSource(result,'EB6-TAXI','owner',[state('t2','2026-11-13T09:00:00Z',['A'])]);
    const m:any={id:'gestion',questions:[{...question,id:1,choix:question.choix.map(c=>({...c,correct:c.lettre==='B'}))}]};
    expect(questionsFaussesDuPassage(m,r).fausses.map(q=>q.question.id)).toEqual([1]);
    expect(r.__core?.questions?.[0].choix[0].correct).toBe(true); expect(r.noteObtenue).toBe(8);
  });
});