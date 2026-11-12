import { expect,it } from 'vitest';
import type { ExamenBlanc } from '@/components/cours-en-ligne/examens-blancs-data';
import { dernieresCopiesOfficielles,modeleExamenOfficiel } from '@/lib/notesOfficiellesEleve';
import { modelesBilansNotes } from '@/lib/notesBilansEleve';
const def={id:'EB1',numero:1,type:'VTC',matieres:[{id:'t3p',nom:'T3P',coefficient:3,noteEliminatoire:6,noteSur:20,questions:[]},{id:'anglais',nom:'Anglais',coefficient:1,noteEliminatoire:4,noteSur:20,questions:[]}]} as unknown as ExamenBlanc;
const row=(id:string,m:string,n:number,at='2026-11-12T12:00:00Z')=>({id,apprenant_id:'own',quiz_type:'examen_blanc',quiz_id:'EB1',matiere_id:m,note_sur_20:n,score_obtenu:n,score_max:20,reussi:true,completed_at:at,details:{}});
it('la note officielle est pondérée 3/1 : 20 et 4 donnent 16, jamais 12',()=>{
 expect(modeleExamenOfficiel(def,[row('a','t3p',20),row('b','anglais',4)]).note).toBe(16);
});
it('absence ne donne pas zéro ; matière absente ou QRC en attente empêche total',()=>{
 expect(modeleExamenOfficiel(def,[])).toMatchObject({note:null,statut:'Non réalisé'});
 expect(modeleExamenOfficiel(def,[row('a','t3p',20)]).note).toBeNull();
 expect(modeleExamenOfficiel(def,[row('a','t3p',20),{...row('b','anglais',4),__core:{pending:true,note20:null}}]).note).toBeNull();
});
it('dernière remise par matière, aucune révision ou autre candidat ; attente récente sans repli',()=>{
 const rows=[row('old','t3p',20),row('new','t3p',2,'2026-11-12T16:00:00Z'),{...row('rev','t3p',19),quiz_type:'revision_fausses'},{...row('other','anglais',20),apprenant_id:'other'}];
 expect(dernieresCopiesOfficielles(rows,'own').map(r=>r.id)).toEqual(['new']);
});
it('coefficient absent n’est pas remplacé par 1',()=>{
 const broken={...def,matieres:def.matieres.map(m=>({...m,coefficient:undefined}))} as unknown as ExamenBlanc;
 expect(modeleExamenOfficiel(broken,[row('a','t3p',20),row('b','anglais',4)]).note).toBeNull();
});
it('six numéros officiels de chaque filière, dates absentes non reliées par une note fictive',()=>{
 for(const type of ['VTC','TAXI','TA','VA'] as const){
  const results=Array.from({length:6},(_,i)=>modeleExamenOfficiel({...def,id:`EB${i+1}${type==='VTC'?'':`-${type}`}`,numero:i+1,type},[]));
  expect(results.map(r=>r.titre)).toEqual(['EB1','EB2','EB3','EB4','EB5','EB6']);expect(results.every(r=>r.note===null&&r.date===null)).toBe(true);
 }
});
it('Bilans historiques : uniquement remises réelles, aucune note globale inventée',()=>{
 expect(modelesBilansNotes({future:[],archives:[{id:'draft',module_id:5,statut_passage:'in_progress',score_bonnes:10}]},[])).toEqual([]);
 const result=modelesBilansNotes({future:[],archives:[{id:'done',module_id:5,exercice_id:500,tentative:1,statut_passage:'submitted',score_bonnes:10,nb_questions:20,passage_updated_at:'2026-11-12'}]},[]);
 expect(result).toHaveLength(1);expect(result[0].note).toBeNull();
});
it('Bilan A–E : cinq vraies remises pondérées, une seule carte ; aucune révision incluse',()=>{
 const base={...def,id:'EB1',matieres:['t3p','gestion','securite','francais','anglais'].map((id,i)=>({id,nom:id,coefficient:i===0?3:1,noteEliminatoire:4,noteSur:20,questions:[],ptsQCM:1}))} as unknown as ExamenBlanc;
 const future=Array.from({length:5},(_,i)=>({id:String(i),module_id:5,exercise_id:500+i,bilan_future_submissions:[{correct_count:i===0?20:10,question_count:20,submitted_at:'2026-11-12'}]}));
 const result=modelesBilansNotes({future,archives:[]},[base]);expect(result).toHaveLength(1);expect(result[0].note).toBe(14.3);
 expect(modelesBilansNotes({future:future.slice(0,4),archives:[]},[base])[0].note).toBeNull();
});