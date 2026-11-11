/** Catalog-only proof. Never merge stored results or grades. */
export type MirrorResult={id:string;apprenant_id:string;quiz_id:string;matiere_id?:string|null;tentative?:number|null;details?:any;rep?:unknown};
export type MirrorAttempt={attempt_id:string;apprenant_id:string;exam_id:string;etat?:string|null;rid?:string|null;matiere?:string|null;snapshot?:any};
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
function letters(v:unknown):string[]|null {
 let a:unknown=v;
 if(typeof v==='string') {try{a=JSON.parse(v);}catch{a=[v];}}
 if(!Array.isArray(a)||!a.every(x=>typeof x==='string'&&/^[A-E]$/.test(x))||new Set(a).size!==a.length)return null;
 return [...a].sort();
}
export function sameMirrorContent(r:MirrorResult,t:MirrorAttempt,answers:Map<string,unknown>):boolean {
 const s=r.details?.snapshot,qs=t.snapshot?.questions,lqs=s?.questions;
 if(s?.examenId!==r.quiz_id||s?.matiereId!==r.matiere_id||!Array.isArray(qs)||!qs.length||!Array.isArray(lqs)||lqs.length!==qs.length)return false;
 const rep=r.details?.reponses??r.rep;if(!object(rep))return false;
 const prefix=`${r.matiere_id}:`,ids=qs.map((q:any)=>String(q.id));
 if(new Set(ids).size!==ids.length||ids.some((id:string)=>!id.startsWith(prefix)))return false;
 if(Object.keys(rep).length!==qs.length||answers.size!==qs.length)return false;
 return qs.every((q:any,i:number)=>{
  const l=lqs[i],id=String(q.id).slice(prefix.length);
  if(String(l?.id)!==id||l.type!==q.type||l.enonce!==q.enonce||Number(l.points)!==Number(q.points)||(l.image??null)!==(q.image??null))return false;
  if(!Object.prototype.hasOwnProperty.call(rep,id)||!answers.has(q.id))return false;
  if(q.type==='QRC')return (l.reponseQRC??null)===(q.reponseQRC??null)&&typeof rep[id]==='string'&&rep[id]===answers.get(q.id);
  if(q.type!=='QCM'||!Array.isArray(q.choix)||!Array.isArray(l.choix)||l.choix.length!==q.choix.length)return false;
  if(!q.choix.every((c:any,j:number)=>c.lettre===l.choix[j].lettre&&c.texte===l.choix[j].texte&&Boolean(c.correct)===Boolean(l.choix[j].correct)))return false;
  const a=letters(rep[id]),b=letters(answers.get(q.id));return !!a&&!!b&&a.every(x=>q.choix.some((c:any)=>c.lettre===x))&&b.every(x=>q.choix.some((c:any)=>c.lettre===x))&&JSON.stringify(a)===JSON.stringify(b);
 });
}
export function proveNativeMirrors(results:MirrorResult[],attempts:MirrorAttempt[],states:{attempt_id:string;question_id:string;valeur:unknown}[]):{mirrors:Set<string>;ambiguous:Set<string>} {
 const mirrors=new Set<string>(),ambiguous=new Set<string>(),links=new Map<string,string[]>();
 const key=(owner:string,exam:string,subject:unknown)=>JSON.stringify([owner,exam,subject]);
 const byScope=new Map<string,MirrorAttempt[]>();
 for(const t of attempts){if(t.rid)continue;const k=key(t.apprenant_id,t.exam_id,t.matiere??t.snapshot?.matiere);const group=byScope.get(k)??[];group.push(t);byScope.set(k,group);}
 const answerMaps=new Map<string,Map<string,unknown>>(),duplicateAnswers=new Set<string>();
 for(const s of states){const map=answerMaps.get(s.attempt_id)??new Map();if(map.has(s.question_id))duplicateAnswers.add(s.attempt_id);map.set(s.question_id,s.valeur);answerMaps.set(s.attempt_id,map);}
 for(const r of results){
  const scoped=byScope.get(key(r.apprenant_id,r.quiz_id,r.matiere_id))??[];
  if(!scoped.length)continue;
  const explicit=r.details?.attempt_id;
  const possible=scoped.filter(t=>{
   if(t.etat!=='terminee'||duplicateAnswers.has(t.attempt_id))return false;
   if(explicit&&explicit!==t.attempt_id)return false;
   const n=Number(t.snapshot?.tentative),rn=Number(r.tentative);
   // Original native snapshots omit tentative. Infer first only from a complete
   // single-attempt scoped inventory; any collision is retained, never time-matched.
   const tn=Number.isInteger(n)&&n>0?n:scoped.length===1?1:null;
   if(!Number.isInteger(rn)||rn<1||tn!==rn)return false;
   return sameMirrorContent(r,t,answerMaps.get(t.attempt_id)??new Map());
  });
  if(possible.length===1)links.set(r.id,[possible[0].attempt_id]);else ambiguous.add(r.id);
 }
 const counts=new Map<string,number>();for(const ids of links.values())for(const id of ids)counts.set(id,(counts.get(id)??0)+1);
 for(const [rid,ids] of links){if(counts.get(ids[0])===1)mirrors.add(rid);else ambiguous.add(rid);}
 return {mirrors,ambiguous};
}