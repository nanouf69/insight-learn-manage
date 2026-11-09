import { describe, expect, it } from 'vitest';
import { projectEb2ReadOnly, readAllPages, type HistoricalEb2Row, type SubmissionEvidence } from './eb2ReadOnlyProjection';
const row = (overrides: Partial<HistoricalEb2Row> = {}): HistoricalEb2Row => ({
  id: 'result-one', apprenant_id: 'learner-one', quiz_id: 'EB2', matiere_id: 't3p', tentative: 1,
  completed_at: '2026-11-09T13:00:00Z', details: { reponses: { '1': 'Réponse exacte', '2': ['A'] },
    snapshot: { questions: [{id: 1, type: 'QRC', enonce: 'Question figée', reponseQRC: 'Corrigé figé', points: 2}, {id: 2, type: 'QCM'}] } },
  ...overrides,
});
const evidence = (overrides: Partial<SubmissionEvidence> = {}): SubmissionEvidence => ({
  apprenant_id: 'learner-one', exercice_id: 'EB2__t3p', tentative: 1, completed: true,
  status: 'submitted', submitted_at: '2026-11-09T13:00:00Z', reponses: { '2': ['A'], '1': 'Réponse exacte' }, ...overrides,
});
const enrolled = new Set(['learner-one']);
describe('Isolated EB2 VTC consultation, never grading', () => {
  it('projects the exact saved QRC and original immutable identity, not a label only', () => {
    const result = projectEb2ReadOnly([row()], [evidence()], enrolled);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({identity:'history:result-one:1', reponse:'Réponse exacte', bareme:2,
      enonce:'Question figée', reponseOfficielle:'Corrigé figé', submissionState:'submitted_exact', canGrade:false});
  });
  it('excludes TAXI and students outside the selected enrollment without cross-copy reuse', () => {
    expect(projectEb2ReadOnly([row({quiz_id:'EB2-TAXI'}),row({apprenant_id:'other'})], [], enrolled)).toEqual([]);
  });
  it('never marks an in-progress answer as submitted or enables grading', () => {
    const [result] = projectEb2ReadOnly([row()], [evidence({completed:false,status:'in_progress',submitted_at:null})], enrolled);
    expect(result.submissionState).toBe('submission_unverified');
    expect(result.canGrade).toBe(false);
  });
  it('requires the same attempt and complete matching answers, not a date window', () => {
    for (const incorrect of [evidence({tentative:2}), evidence({reponses:{'1':'Different'}}),evidence({exercice_id:'EB2__gestion'})]) {
      expect(projectEb2ReadOnly([row()], [incorrect], enrolled)[0].submissionState).toBe('submission_unverified');
    }
  });
  it('uses the exact retake exercise identity and never collapses original result IDs', () => {
    const result = projectEb2ReadOnly([row(),row({id:'result-two',tentative:2})], [evidence({tentative:2,exercice_id:'EB2__t3p__t2'})], enrolled);
    expect(result.map(r=>r.identity)).toEqual(['history:result-one:1','history:result-two:1']);
    expect(result.map(r=>r.submissionState)).toEqual(['submission_unverified','submitted_exact']);
  });
  it('does not change any source result or submission object', () => {
    const rows=[row()], submissions=[evidence()]; const before=JSON.stringify([rows,submissions]);
    projectEb2ReadOnly(rows,submissions,enrolled);
    expect(JSON.stringify([rows,submissions])).toBe(before);
  });
  it('reads 1205 records through two pages without truncating at 1000', async () => {
    const records=Array.from({length:1205},(_,i)=>i),calls:number[]=[];
    const result=await readAllPages(async(from,to)=>{calls.push(from);return records.slice(from,to+1);});
    expect(result).toHaveLength(1205); expect(result[1204]).toBe(1204); expect(calls).toEqual([0,1000]);
  });
  it('fails the whole read when a later page fails instead of showing a partial successful menu', async () => {
    await expect(readAllPages(async(from)=>{if(from)throw Error('network');return Array(1000).fill('row');})).rejects.toThrow('network');
  });
});