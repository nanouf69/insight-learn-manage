/** Date evidence only; never changes measured hours, contractual dates or completion. */
export interface ActivitePedagogiquePreuve {id:string;apprenantId:string;userId:string;at:string;type:'lecture_effective'|'exercice_remis'|'quiz_remis';serveur:boolean;qualifiante:boolean}
const paris=(at:string)=>new Date(at).toLocaleDateString('sv-SE',{timeZone:'Europe/Paris'});
export function periodePedagogiqueProuvee(rows:readonly ActivitePedagogiquePreuve[],apprenantId:string,userId:string) {
 const uniques=new Map<string,ActivitePedagogiquePreuve>();
 for(const r of rows){
  if(r.apprenantId!==apprenantId||r.userId!==userId||!r.serveur||!r.qualifiante||!Number.isFinite(Date.parse(r.at)))continue;
  const old=uniques.get(r.id);if(old&&JSON.stringify(old)!==JSON.stringify(r))throw new Error('Événement pédagogique contradictoire');
  uniques.set(r.id,r);
 }
 const sorted=[...uniques.values()].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 const first=sorted[0],last=sorted.at(-1);
 return {premiere:first?paris(first.at):null,derniere:last?paris(last.at):null,preuveDerniere:last??null};
}
export function synthesePeriodeElearning(p:{derniere:string|null;administrative:string|null;minutes:number|null;cibleMinutes:number|null;achevementProuve:boolean}) {
 const heuresSuffisantes=p.minutes!=null&&p.cibleMinutes!=null&&p.cibleMinutes>0&&p.minutes>=p.cibleMinutes;
 return {...p,finEffective:p.achevementProuve&&heuresSuffisantes?p.derniere:null,achevee:p.achevementProuve&&heuresSuffisantes&&!!p.derniere};
}