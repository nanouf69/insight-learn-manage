import {origineCorrection,type QrcReelle,type SessionReelle} from './noyauReel';
export type VueQrc='corriger'|'valider'|'verifier'|'historique';
/** Display only. Never authorizes a write or changes persisted grading state. */
export function statutFile(q:QrcReelle,s:SessionReelle):VueQrc {
 const t=s.tentatives.find(t=>t.attempt_id===q.attempt_id);
 const question=t?.snapshot.questions.find(x=>x.id===q.question_id&&x.type==='QRC');
 const b=question?.points??s.baremesRestaures.find(x=>x.qrc_instance_id===q.qrc_instance_id)?.bareme;
 const h=(t as any)?.historique;
 const identity=!!t&&t.etat==='terminee'&&!t.consultationSeule&&t.apprenant_id===q.apprenant_id&&!!question;
 const notable=identity&&typeof b==='number'&&Number.isFinite(b)&&b>0&&(!q.qrc_instance_id.startsWith('consultation:')||(h?.score_obtenu!=null&&['remise_identique','liaison_prouvee'].includes(h?.provenance)));
 if(q.etat==='corrigee')return origineCorrection(q)==='ia'?(notable?'valider':'verifier'):'historique';
 return notable?'corriger':'verifier';
}
export function qrcDansVue(s:SessionReelle|null,vue:VueQrc,passage:string|null=null){return s?.qrc.filter(q=>(!passage||q.attempt_id===passage)&&statutFile(q,s)===vue)??[];}