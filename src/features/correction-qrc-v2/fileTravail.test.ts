import {describe,it,expect} from 'vitest';
import {statutFile,qrcDansVue} from './fileTravail';
import type {SessionReelle,QrcReelle} from './noyauReel';
const q={qrc_instance_id:'q',attempt_id:'t',question_id:'gestion:1',apprenant_id:'u',reponse:'Réponse',etat:'en_attente',note:null} as QrcReelle;
const s={tentatives:[{attempt_id:'t',apprenant_id:'u',etat:'terminee',snapshot:{questions:[{id:'gestion:1',type:'QRC',points:2}],matieres:[]}}],qrc:[q],baremesRestaures:[],resultats:[]} as unknown as SessionReelle;
describe('file de travail uniquement',()=>{
 it('QRC en attente notable dans la file',()=>expect(statutFile(q,s)).toBe('corriger'));
 it('note validée zéro hors file',()=>expect(statutFile({...q,etat:'corrigee',note:0,corrige_email:'formateur'},s)).toBe('historique'));
 it('IA non validée séparée',()=>expect(statutFile({...q,etat:'corrigee',note:1,corrige_email:'ia:model'},s)).toBe('valider'));
 it('QCM exclu de la file',()=>{const x=structuredClone(s);x.tentatives[0].snapshot.questions[0].type='QCM';expect(qrcDansVue(x,'corriger')).toEqual([]);});
 it('barème absent, mauvais propriétaire et archive neutralisée non notables',()=>{for(const change of [{consultationSeule:true},{apprenant_id:'other'}]){const x=structuredClone(s);Object.assign(x.tentatives[0],change);expect(statutFile(q,x)).toBe('verifier');}const x=structuredClone(s);x.tentatives[0].snapshot.questions[0].points=undefined as any;expect(statutFile(q,x)).toBe('verifier');});
 it('vue vide et passage distinct',()=>{expect(qrcDansVue({...s,qrc:[]},'corriger')).toEqual([]);expect(qrcDansVue(s,'corriger','other')).toEqual([]);});
});