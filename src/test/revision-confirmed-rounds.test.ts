import {expect,it} from 'vitest';
import {selectConfirmedRevisionRounds} from '@/lib/revisionConfirmedRounds';
import {choisirTentativeRevision} from '@/lib/revisionFaussesTentative';
const items=[{matiere:{id:'f'},question:{id:1},sourceResultId:'copy-f'},{matiere:{id:'g'},question:{id:1},sourceResultId:'copy-g'}];
const row=(n:number,answers:Record<string,unknown>,sources={'f:1':'copy-f','g:1':'copy-g'},completed=false)=>({exercice_id:`revision_fausses_EB6-TAXI${n===1?'':`__r${n}`}`,completed,write_seq:n,reponses:{revisionState:{examenId:'EB6-TAXI',answers,sourceResultIds:sources}}});
it('uses latest confirmed question per relevant source across partial rounds',()=>{
 const out=selectConfirmedRevisionRounds('EB6-TAXI',[row(1,{'f:1':['A'],'g:1':'old'}),row(2,{'f:1':['B','C']})],items,new Set());
 expect(out.answers).toEqual({'f:1':['B','C'],'g:1':'old'});expect(out.origins['f:1']).toEqual({round:'revision_fausses_EB6-TAXI__r2',writeSeq:2});
});
it('never resurrects an abandoned round after a newer completed one',()=>{
 const rows=[row(1,{'f:1':['A']}),row(10,{'f:1':['B']},undefined,true)];
 expect(choisirTentativeRevision('revision_fausses_EB6-TAXI',rows)).toBe('revision_fausses_EB6-TAXI__r11');
 expect(selectConfirmedRevisionRounds('EB6-TAXI',rows,items,new Set([rows[1].exercice_id])).exerciseId).toBe('revision_fausses_EB6-TAXI__r11');
});
it('preserves foreign/interrupted rounds without borrowing or overwriting',()=>{
 const rows=[row(1,{'f:1':['A']},{'f:1':'old-copy','g:1':'old-copy'},true)];const before=JSON.stringify(rows);
 const out=selectConfirmedRevisionRounds('EB6-TAXI',rows,items,new Set());expect(out.selected).toBeUndefined();expect(out.answers).toEqual({});expect(out.preserved).toBe(1);expect(JSON.stringify(rows)).toBe(before);
});
it('explicit empty latest answer never falls back to previous answer',()=>{
 expect(selectConfirmedRevisionRounds('EB6-TAXI',[row(1,{'f:1':['A']}),row(2,{'f:1':[]})],items,new Set()).answers['f:1']).toEqual([]);
});
it('duplicate server rows are ambiguous even when their content agrees',()=>{
 expect(()=>selectConfirmedRevisionRounds('EB6-TAXI',[row(1,{}),row(1,{})],items,new Set())).toThrow('revue');
});
it('never transfers an answer across F/G, another exam, or unproven source',()=>{
 const foreign=row(2,{'f:1':['B']});foreign.reponses.revisionState.examenId='EB5-TAXI';
 expect(selectConfirmedRevisionRounds('EB6-TAXI',[foreign],items,new Set()).answers).toEqual({});
 expect(selectConfirmedRevisionRounds('EB6-TAXI',[row(1,{'1':['A'],'f:1':['B']},{'f:1':'unknown','g:1':'copy-g'})],items,new Set()).answers).toEqual({});
});