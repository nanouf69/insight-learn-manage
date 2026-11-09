import { describe, expect, it } from 'vitest';
import { rafraichirCopiesAffichees } from '@/lib/refreshSavedExamResults';
describe('Late correction refresh by immutable result ID',()=>{
  it('same row updates pending proof; a newer attempt never replaces the displayed copy',()=>{
    const original=[{resultId:'r1',quizId:'EB2',matiereId:'t3p',noteObtenue:9,maxPoints:20,details:{qrc_pending_correction:true}}];
    const next=rafraichirCopiesAffichees(original,[{id:'r1',quiz_id:'EB2',matiere_id:'t3p',details:{qrc_pending_correction:false},tentative:1},{id:'r2',quiz_id:'EB2',matiere_id:'t3p',details:{},tentative:2}],()=>({scoreObtenu:12,scoreMax:20,admis:true}));
    expect(next[0]).toMatchObject({resultId:'r1',noteObtenue:12,details:{qrc_pending_correction:false},tentative:1});
    expect(original[0].details.qrc_pending_correction).toBe(true);
  });
  it('wrong subject or missing read preserves the original instead of guessing',()=>{
    const original=[{resultId:'r1',quizId:'EB2',matiereId:'t3p',noteObtenue:9}];
    expect(rafraichirCopiesAffichees(original,[{id:'r1',quiz_id:'EB1',matiere_id:'t3p'}],()=>{throw Error('must not score')})).toEqual(original);
    expect(rafraichirCopiesAffichees(original,[],()=>null)).toEqual(original);
  });
});