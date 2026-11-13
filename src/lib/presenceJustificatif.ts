import { z } from 'zod';
import { creneauxSessionInscrite } from './emargementSessionSlots';
import { minutesHorairePresence } from './heuresRestantSigner';
import { parseClockMinutes } from './pratiqueSlots';
export const PRESENCE_PDF_MAX_BYTES = 4 * 1024 * 1024;
export const justificatifPresenceSchema = z.object({type:z.enum(['feuille','attestation','autre']),libelle:z.string().trim().max(200)}).refine(v=>v.type!=='autre'||v.libelle.length>0,'Précisez le justificatif');
/** Local screening only; a server parser, private storage and atomic evidence link remain required. */
export async function verifierPdfPresence(file: Pick<File,'name'|'type'|'size'|'arrayBuffer'>) {
  if(!/\.pdf$/i.test(file.name)||file.type!=='application/pdf')throw new Error('PDF uniquement : extension et type PDF requis.');
  if(file.size<=0||file.size>PRESENCE_PDF_MAX_BYTES)throw new Error('Le PDF doit contenir des données et ne pas dépasser 4 Mo.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes.length!==file.size||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new Error('Signature PDF invalide.');
  if(!new TextDecoder().decode(bytes.slice(-2048)).includes('%%EOF'))throw new Error('PDF incomplet ou invalide.');
  return file;
}
export function retrouverInscriptionPresence(rows:readonly any[],cible:{date?:string;creneau?:string;horaires?:string;pratique:boolean},filiere:string) {
  if(cible.pratique)return {inscription:null,message:'Rattachement pratique exact non prouvé : aucune validation autorisée.'};
  // Exact labels emitted by calculerSignaturesManquantes; no fuzzy label matching.
  const labels:Record<string,string>={'Matin':'matin','Après-midi':'apres_midi','Soir 1 (17h-18h30)':'soir_1','Soir 2 (18h30-21h)':'soir_2'};
  const key=labels[cible.creneau ?? ''] ?? cible.creneau;
  const matches=rows.filter(row=>creneauxSessionInscrite(row,filiere).some(s=>s.date===cible.date&&s.creneau===key&&
    minutesHorairePresence(`${s.debut}-${s.fin}`)===minutesHorairePresence(cible.horaires)&&
    parseClockMinutes(s.debut)===parseClockMinutes(cible.horaires?.split(/[-–]/)[0].replace('h',':').replace(/:$/,':00'))));
  const unique=new Map(matches.filter(r=>r.id&&r.session_id).map(r=>[r.id,r]));
  if(unique.size!==1)return {inscription:null,message:unique.size?'Plusieurs inscriptions correspondent : revue administrative requise.':'Aucune inscription autorisée ne correspond exactement au créneau.'};
  return {inscription:[...unique.values()][0],message:''};
}