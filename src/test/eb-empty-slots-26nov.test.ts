import {describe,it,expect} from 'vitest';
import {libelleAttenteEB} from '@/lib/ebCanonicalStatus';
import {isExamAttemptPublicationPending} from '@/components/cours-en-ligne/exam-helpers';
describe('Empty subject slots never become marks or crash a pending-status label',()=>{
  it.each(['EB1','EB3','EB5'])('%s empty/QRC/submitted states remain distinct',()=>{
    expect(isExamAttemptPublicationPending([null,null])).toBe(false);
    expect(libelleAttenteEB([null,{details:{qrc_pending_correction:true}},null])).toBe('En attente de correction des QRC');
    expect(libelleAttenteEB([null,{__revueProvenance:true},null])).toBe('Copie remise — à vérifier');
    expect(libelleAttenteEB([null,{__core:{lectureImpossible:true}},null])).toBe('Lecture des notes indisponible');
  });
});