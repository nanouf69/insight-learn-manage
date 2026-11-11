import type {InfosHistorique} from './eb2Consultation';
import {ordonnerCandidatsParFin} from './ordreCandidats';
import {origineCorrection,type QrcReelle,type SessionReelle} from './noyauReel';
export type VueQrc='corriger'|'valider'|'verifier'|'historique'|'toutes';
/** Display only. Never authorizes a write or changes persisted grading state. */
export function statutFile(q:QrcReelle,s:SessionReelle):VueQrc {
 const t=s.tentatives.find(t=>t.attempt_id===q.attempt_id);
 const question=t?.snapshot.questions.find(x=>x.id===q.question_id&&x.type==='QRC');
 const b=question?.points??s.baremesRestaures.find(x=>x.qrc_instance_id===q.qrc_instance_id)?.bareme;
 const h=(t as (typeof t & {historique?:InfosHistorique}))?.historique;
 const identity=!!t&&t.etat==='terminee'&&!t.consultationSeule&&t.apprenant_id===q.apprenant_id&&!!question;
 const notable=identity&&typeof b==='number'&&Number.isFinite(b)&&b>0&&(!q.qrc_instance_id.startsWith('consultation:')||(h?.score_obtenu!=null&&['remise_identique','remise_horodatage_divergent','liaison_prouvee'].includes(h?.provenance)));
 if(q.etat==='corrigee')return origineCorrection(q)==='ia'?(notable?'valider':'verifier'):'historique';
 return notable?'corriger':'verifier';
}
export function qrcDansVue(s:SessionReelle|null,vue:VueQrc,passage:string|null=null){return s?.qrc.filter(q=>(!passage||q.attempt_id===passage)&&(vue==='toutes'||statutFile(q,s)===vue))??[];}
export function voisineFile(s:SessionReelle|null,vue:VueQrc,selection:string|null,direction:-1|1,passage:string|null=null){
 const ordre=ordonnerCandidatsParFin(s?.tentatives??[]).map(t=>t.attempt_id);
 const file=qrcDansVue(s,vue,passage).sort((a,b)=>ordre.indexOf(a.attempt_id)-ordre.indexOf(b.attempt_id));
 const i=file.findIndex(q=>q.qrc_instance_id===selection);
 return i<0?null:file[i+direction]??null;
}