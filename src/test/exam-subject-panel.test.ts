import {expect,it} from 'vitest';
import {composeSubjectPanel} from '@/lib/examSubjectPanel';
import {EXAMENS_BLANCS_VTC,EXAMENS_BLANCS_TAXI,EXAMENS_BLANCS_TA,EXAMENS_BLANCS_VA} from '@/components/cours-en-ligne/examens-blancs-data';
it('EB3 VTC keeps seven official subjects including A without a result and six result identities unchanged',()=>{
 const exam=EXAMENS_BLANCS_VTC.find(e=>e.id==='EB3');expect(exam).toBeDefined();if(!exam)throw Error('missing');
 const results=exam.matieres.slice(1).map(m=>({matiere_id:m.id,score:12}));const before=structuredClone(results);const rows=composeSubjectPanel(exam.matieres,results);
 expect(rows).toHaveLength(7);expect(rows[0].subject.id).toBe('t3p');expect(rows[0].result).toBeNull();expect(rows.filter(r=>r.result)).toHaveLength(6);expect(results).toEqual(before);
});
it('each track uses only its official subjects and order',()=>{for(const exam of [...EXAMENS_BLANCS_TAXI,...EXAMENS_BLANCS_TA,...EXAMENS_BLANCS_VA]){const rows=composeSubjectPanel(exam.matieres,[{matiere_id:'other_track'}]);expect(rows.map(r=>r.subject.id)).toEqual(exam.matieres.map(m=>m.id));expect(rows.every(r=>r.result===null)).toBe(true)}});
