import { expect, it } from 'vitest';
import { moyenneNotesDefinitives, moyenneSessionExamen, notesMatieresSession, type ReleveSession, type ExamenNotesSession } from './notesSession';
import type { ExamenBlanc } from '@/components/cours-en-ligne/examens-blancs-data';
const exam:ExamenNotesSession={id:'EB1',numero:1,filiere:'VTC',matieres:[{id:'a',nom:'A'},{id:'b',nom:'B'}]};
const fixture:ReleveSession={inscrits:[{id:'v1',nom:'A',prenom:'V',type_apprenant:'vtc'},{id:'v2',nom:'B',prenom:'V',type_apprenant:'vtc'},{id:'t1',nom:'C',prenom:'T',type_apprenant:'taxi'}],notes:{v1:{1:{etat:'definitif',note:0},2:{etat:'definitif',note:18}},v2:{1:{etat:'attente',note:null}},t1:{1:{etat:'definitif',note:20}}},matieres:{v1:{EB1:{a:{etat:'definitif',note:0},b:{etat:'attente',note:null}}},v2:{EB1:{a:{etat:'definitif',note:14},b:{etat:'definitif',note:10}}}},erreur:null};
it('zéro définitif inclus ; attente/absence/provisoire exclus',()=>expect(moyenneNotesDefinitives([{etat:'definitif',note:0},{etat:'definitif',note:16},{etat:'attente',note:20},{etat:'non_passe',note:null},{etat:'indisponible',note:12}],5)).toEqual({note:8,n:2,inscrits:5}));
it('EB1 VTC ne fusionne pas EB1 TAXI et dénominateur concerne seulement VTC',()=>{expect(moyenneSessionExamen(fixture,exam)).toEqual({note:0,n:1,inscrits:2});expect(moyenneSessionExamen(fixture,{...exam,id:'EB1-TAXI',filiere:'TAXI'})).toEqual({note:20,n:1,inscrits:1});});
it('matière définitive comptée malgré attente dans le général et les autres matières',()=>{expect(moyenneSessionExamen(fixture,exam,'a')).toEqual({note:7,n:2,inscrits:2});expect(moyenneSessionExamen(fixture,exam,'b')).toEqual({note:10,n:1,inscrits:2});});
it('EB2 ne réutilise jamais EB1',()=>expect(moyenneSessionExamen(fixture,{...exam,id:'EB2',numero:2})).toEqual({note:18,n:1,inscrits:2}));
it('session vide et absence de définitive : null, jamais zéro inventé',()=>{expect(moyenneNotesDefinitives([],0)).toEqual({note:null,n:0,inscrits:0});expect(moyenneNotesDefinitives([{etat:'attente',note:null}],1)).toEqual({note:null,n:0,inscrits:1});});
it('projection des matières lit les notes officielles indépendamment, avec vrai zéro',()=>{
 const def={...exam,type:'VTC',titre:'EB1',matieres:[{id:'a',nom:'A',questions:[]},{id:'b',nom:'B',questions:[]}]} as unknown as ExamenBlanc;
 const rows=[{matiere_id:'a',matiere_nom:'A',quiz_type:'examen_blanc',__core:{pending:false,note20:0},details:{}},{matiere_id:'b',matiere_nom:'B',quiz_type:'examen_blanc',__core:{pending:true,note20:12},details:{}}];
 expect(notesMatieresSession(def,rows)).toEqual({a:{etat:'definitif',note:0},b:{etat:'attente',note:null}});
});