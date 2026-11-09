import { describe, expect, it } from 'vitest';
import { OriginalSource, prospectiveExamIds, prospectiveScope } from './scope';
const activation = '2026-11-09T13:02:00Z';
function sources(examId = 'EB3'): OriginalSource[] {
  return ['A','B','C','D','E','F','G'].map(subjectId => ({ examId, learnerId:'learner',subjectId,attemptId:`attempt-${subjectId}`,originalId:'original',originalStartedAt:'2026-11-09T13:02:01Z',startedAt:'2026-11-09T13:02:01Z',snapshotFingerprint:'frozen',snapshotSubjectId:subjectId,questions:[{id:1}],isTest:false }));
}
describe('EB3–EB6 prospective scope, test-only', () => {
  it.each(prospectiveExamIds)('allows only a complete new original %s', id => expect(prospectiveScope(id,'learner',activation,sources(id))).toBe(true));
  it.each(['EB1','EB2','EB1-TAXI','EB2-TAXI','EB3-TA','eb3','EB7'])('excludes %s even after activation', id => expect(prospectiveScope(id,'learner',activation,sources(id))).toBe(false));
  it('excludes an original begun before activation even if later subjects/revision are new', () => { const s=sources();s[0].startedAt='2026-11-09T13:01:59Z';expect(prospectiveScope('EB3','learner',activation,s)).toBe(false); });
  it('excludes the activation instant itself', () => { const s=sources();s[0].startedAt=activation;expect(prospectiveScope('EB3','learner',activation,s)).toBe(false); });
  it('excludes legacy sources without a frozen snapshot', () => { const s=sources();s[0].questions=null;expect(prospectiveScope('EB3','learner',activation,s)).toBe(false); });
  it('excludes incomplete original roster', () => expect(prospectiveScope('EB3','learner',activation,sources().slice(1))).toBe(false));
  it('excludes a different learner', () => expect(prospectiveScope('EB3','other',activation,sources())).toBe(false));
  it('excludes mixed exam identities', () => { const s=sources();s[0].examId='EB2';expect(prospectiveScope('EB3','learner',activation,s)).toBe(false); });
  it('excludes duplicated subjects', () => { const s=sources();s[0].subjectId='B';expect(prospectiveScope('EB3','learner',activation,s)).toBe(false); });
  it('excludes borrowed attempt identity', () => { const s=sources();s[0].attemptId=s[1].attemptId;expect(prospectiveScope('EB3','learner',activation,s)).toBe(false); });
  it('excludes source without fingerprint', () => { const s=sources();s[0].snapshotFingerprint=' ';expect(prospectiveScope('EB3','learner',activation,s)).toBe(false); });
  it('excludes mismatched snapshot subject', () => { const s=sources();s[0].snapshotSubjectId='B';expect(prospectiveScope('EB3','learner',activation,s)).toBe(false); });
  it('excludes empty snapshot', () => { const s=sources();s[0].questions=[];expect(prospectiveScope('EB3','learner',activation,s)).toBe(false); });
  it('does not activate without server activation', () => expect(prospectiveScope('EB3','learner',null,sources())).toBe(false));
  it('excludes old parent even if every subject is new', () => { const s=sources();s.forEach(a=>a.originalStartedAt='2026-11-09T13:01:59Z');expect(prospectiveScope('EB3','learner',activation,s)).toBe(false); });
  it('excludes mixed originals', () => { const s=sources();s[0].originalId='another';expect(prospectiveScope('EB3','learner',activation,s)).toBe(false); });
});