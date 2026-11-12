import {expect,it} from 'vitest';
import {copieRecenteSession} from './copieRecenteSession';
import {noteExamenAffichee} from '@/lib/noteExamenAffichee';
import type {CoreMatiereState} from '@/lib/coreExamPublication';
const row={id:'legacy',apprenant_id:'learner',quiz_id:'EB4',matiere_id:'securite',quiz_type:'examen_blanc',completed_at:'2026-11-12T16:04:00Z',details:{reponses:{1:'old'}},__core:{lectureImpossible:true}};
const state=(id:string,finishedAt:string,note20:number|null,extra:Partial<CoreMatiereState>={}):CoreMatiereState=>({attemptId:id,apprenantId:'learner',examId:'EB4',matiereId:'securite',finishedAt,note20,status:'definitif',pending:false,qrcTotal:0,qrcRestantes:0,answers:{1:id},...extra});
const older=state('old','2026-11-11T19:09:00Z',18);
const newer=state('new','2026-11-12T16:04:00Z',13);
it('retient la dernière copie remise même après 21 heures et avec une note différente',()=>{
  const r=copieRecenteSession(row,[newer,older],new Set());
  expect(r.id).toBe('new');expect(noteExamenAffichee(r)).toMatchObject({etat:'note',note20:13});
  expect(r.details.reponses).toEqual({1:'new'});
});
it('la dernière copie en attente ne récupère jamais la note définitive précédente',()=>{
  const r=copieRecenteSession(row,[older,{...newer,pending:true,status:'provisoire',note20:null}],new Set());
  expect(noteExamenAffichee(r)).toMatchObject({etat:'en_attente',note20:null});
});
it('une copie récente non fiable reste indisponible sans repli',()=>expect(noteExamenAffichee(copieRecenteSession(row,[older,newer],new Set(['new'])))).toMatchObject({etat:'lecture_impossible',note20:null}));
it('isole apprenant examen matière et exclut les neutralisations',()=>{
  const other=state('other','2026-11-12T17:00:00Z',20);
  const r=copieRecenteSession(row,[newer,{...other,apprenantId:'other'},{...other,examId:'EB4-TAXI'},{...other,matiereId:'gestion'},{...other,neutralise:true}],new Set());
  expect(r.id).toBe('new');
});
it('utilise la fin de remise et non une date de correction, égalités départagées par ID stable',()=>{
  const b={...newer,attemptId:'z'};const a={...newer,attemptId:'a'};
  expect(copieRecenteSession(row,[a,b],new Set()).id).toBe('z');
  expect(copieRecenteSession(row,[b,a],new Set()).id).toBe('z');
});
it('ne remplace pas une remise legacy plus récente par un ancien passage V2',()=>expect(copieRecenteSession(row,[older],new Set())).toBe(row));
it('ne modifie aucune copie réponse ou note source',()=>{
  const states=[older,newer];const before=JSON.stringify({row,states});
  copieRecenteSession(row,states,new Set());expect(JSON.stringify({row,states})).toBe(before);
});
it('un vrai zéro définitif de la dernière copie reste zéro',()=>expect(noteExamenAffichee(copieRecenteSession(row,[older,{...newer,note20:0}],new Set()))).toMatchObject({etat:'note',note20:0}));