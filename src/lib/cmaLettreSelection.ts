import { ALL_DATES_EXAMEN_PRATIQUE, trouverExamenTheorique } from '@/lib/examDatesConfig';
export type CmaCategorie = 'VTC' | 'TAXI';
export interface CmaCandidat { id:string; nom:string; prenom:string; type_apprenant?:string|null; date_examen_theorique?:string|null; date_examen_pratique?:string|null; resultat_examen?:string|null; resultat_examen_pratique?:string|null; deleted_at?:string|null; abandonnee?:boolean|null }
export interface CmaPreuve { apprenant_id:string; date_examen:string; filiere:string; territoire?:string|null }
export interface CmaConfirmation { apprenant_id:string; statut_suivi?:string|null; sessions?:{type_session?:string|null;date_debut?:string|null}|null }
const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function categorieCma(type?:string|null):CmaCategorie|null {
 const t=(type??'').toLowerCase();
 if(['taxi','taxi-e','taxi-e-presentiel','ta','ta-e','pa-taxi','rp-taxi'].includes(t))return 'TAXI';
 if(['vtc','vtc-e','vtc-e-presentiel','va','va-e','pa-vtc','rp-vtc'].includes(t))return 'VTC';
 return null;
}
export function periodePratiqueCma(value:string){
 const months:Record<string,string>={janvier:'01',fevrier:'02',mars:'03',avril:'04',mai:'05',juin:'06',juillet:'07',aout:'08',septembre:'09',octobre:'10',novembre:'11',decembre:'12'};
 const m=norm(value).match(/^du (\d+)(?:er)?(?: (\w+))? au (\d+)(?:er)? (\w+) (\d{4})$/);
 if(!m||!months[m[2]??m[4]]||!months[m[4]])return null;
 return {start:`${m[5]}-${months[m[2]??m[4]]}-${m[1].padStart(2,'0')}`,end:`${m[5]}-${months[m[4]]}-${m[3].padStart(2,'0')}`};
}
export function selectionLettreCma(candidats:readonly CmaCandidat[],preuves:readonly CmaPreuve[], confirmations:readonly CmaConfirmation[],examDate:string,period:string,territoire:string,exclus:readonly string[]=[]){
 const target=periodePratiqueCma(period), exam=trouverExamenTheorique(examDate);
 const periods=ALL_DATES_EXAMEN_PRATIQUE.map(periodePratiqueCma).filter((p):p is NonNullable<typeof p>=>p!==null).sort((a,b)=>a.start.localeCompare(b.start));
 const index=target?periods.findIndex(p=>p.start===target.start&&p.end===target.end):-1;const previous=index>0?periods[index-1]:null;
 const confirmes:CmaCandidat[]=[],aRepresenter:CmaCandidat[]=[],aVerifier:Array<{candidat:CmaCandidat;raison:string}>=[];const seen=new Set<string>();
 const inRange=(date:string,p:{start:string;end:string})=>date>=p.start&&date<=p.end;
 if(!target)return {confirmes,aRepresenter,aVerifier,erreur:'Période pratique non publiée ou non déterminée'};
 for(const a of candidats){
  if(seen.has(a.id)||exclus.includes(a.id)||a.deleted_at||a.abandonnee)continue;seen.add(a.id);
  const cat=categorieCma(a.type_apprenant);if(!cat)continue;
  if(['annule','absent'].includes(a.resultat_examen_pratique??''))continue;
  const native=preuves.filter(p=>p.apprenant_id===a.id&&p.filiere.toUpperCase()===cat);
  const current=native.filter(p=>inRange(p.date_examen,target));
  const exact=exam&&confirmations.some(c=>c.apprenant_id===a.id&&c.statut_suivi==='inscription_validee'&&c.sessions?.type_session==='examen'&&c.sessions.date_debut===exam.iso)&&trouverExamenTheorique(a.date_examen_theorique)?.iso===exam.iso;
  if(current.length||exact){
   if(current.some(p=>p.territoire===territoire)){confirmes.push(a);continue;}
   aVerifier.push({candidat:a,raison:'Confirmation ou planning présent : territoire pratique non prouvé'});continue;
  }
  if(a.resultat_examen_pratique!=='non'||!previous)continue;
  const date=a.date_examen_pratique??'';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!inRange(date,previous))continue;
  if(native.some(p=>p.date_examen>date))continue;
  const source=native.filter(p=>p.date_examen===date);
  if(source.some(p=>p.territoire===territoire)){aRepresenter.push(a);continue;}
  aVerifier.push({candidat:a,raison:source.length?'Ajourné précédent : territoire pratique non prouvé':'Ajourné précédent : passage CMA et territoire à vérifier'});
 }
 const sort=(a:CmaCandidat,b:CmaCandidat)=>`${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`,'fr');
 return {confirmes:confirmes.sort(sort),aRepresenter:aRepresenter.sort(sort),aVerifier,erreur:null};
}