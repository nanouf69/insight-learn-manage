import { supabase } from '@/integrations/supabase/client';
import { creneauxSessionInscrite } from '@/lib/emargementSessionSlots';
import { aPreuveSignatureEmargement } from '@/lib/preuveSignatureEmargement';
import { jourParis } from './sessionsActuelles';
import { lirePagesParalleles } from './noyauReel';

export type PreuvesJour = { inscriptions: any[]; signatures: any[]; papier: any[]; heures: any[]; jour: string; minuteParis: number; erreur?: boolean };
const signature = (r: any) => !!r.signed_at && aPreuveSignatureEmargement(r);
const papierValide = (r: any) => Number(r.heures)>0 && !!r.documents_inscription?.url && !/refus|annul/i.test(r.documents_inscription?.statut??'');
const minutes = (clock: string) => Number(clock.slice(0,2))*60+Number(clock.slice(3,5));
/** Conservative day absence: every expected slot finished and independently proven dispensed. */
export function absentsSessionJour(p: PreuvesJour): Set<string> {
  const out=new Set<string>();
  if(p.erreur)return out;
  const slots=new Map<string,ReturnType<typeof creneauxSessionInscrite>>();
  for(const row of p.inscriptions){
    const a=row.apprenants;
    if(!a||a.deleted_at||a.abandonnee||/annul|abandon|exclu|attente/i.test(a.statut??'')||/en[- ]?ligne|e[- ]?learning|online|distanciel/i.test(a.creneau_horaire??'')||/-e$/i.test(a.type_apprenant??''))continue;
    const s=creneauxSessionInscrite(row,String(a.type_apprenant??'').toUpperCase()).filter(s=>s.date===p.jour);
    if(s.length)slots.set(row.apprenant_id,s);
  }
  const avecPresence=new Set([
    ...p.signatures.filter(signature).map(r=>r.apprenant_id),
    ...p.papier.filter(papierValide).map(r=>r.apprenant_id),
    ...p.heures.filter(r=>Number(r.heures)>0).map(r=>r.apprenant_id),
  ]);
  for(const [id,attendus] of slots){
    if(avecPresence.has(id)||attendus.some(s=>!Number.isFinite(minutes(s.fin))||minutes(s.fin)>=p.minuteParis))continue;
    const dispenses=attendus.every(s=>p.signatures.some(r=>r.apprenant_id!==id&&signature(r)&&r.demi_journee===s.creneau&&slots.get(r.apprenant_id)?.some(peer=>peer.creneau===s.creneau&&peer.debut<=s.debut&&peer.fin>=s.fin))||p.papier.some(r=>r.apprenant_id!==id&&papierValide(r)&&r.creneau===s.creneau&&slots.get(r.apprenant_id)?.some(peer=>peer.creneau===s.creneau&&peer.debut<=s.debut&&peer.fin>=s.fin)));
    if(dispenses)out.add(id);
  }
  return out;
}

export async function chargerAbsentsSessionJour(sessionId:string,now=new Date()):Promise<Set<string>>{
  const jour=jourParis(now);
  const auth=await supabase.auth.getSession();const user=auth.data.session?.user.id;
  if(!user)return new Set();
  const role=await supabase.rpc('has_role',{_user_id:user,_role:'admin'});
  if(role.error||role.data!==true)return new Set();
  try{
    const inscriptions=await lirePagesParalleles<any>(de=>supabase.from('session_apprenants').select('*,sessions:session_id(*),apprenants:apprenant_id(id,type_apprenant,statut,abandonnee,deleted_at,creneau_horaire)').eq('session_id',sessionId).order('id').range(de,de+999) as any,1);
    const ids=[...new Set(inscriptions.map(r=>r.apprenant_id))];
    const signatures:any[]=[],papier:any[]=[],heures:any[]=[];
    for(let i=0;i<ids.length;i+=100){
      const lot=ids.slice(i,i+100);
      const [s,p,h]=await Promise.all([
        lirePagesParalleles<any>(de=>supabase.from('emargements_fc').select('id,apprenant_id,demi_journee,signature_data_url,signed_at,absent,masque').in('apprenant_id',lot).eq('date_emargement',jour).eq('masque',false).order('id').range(de,de+999) as any,1),
        lirePagesParalleles<any>(de=>supabase.from('fc_signatures_papier').select('id,apprenant_id,session_id,creneau,heures,documents_inscription:document_id(url,statut)').in('apprenant_id',lot).eq('date_presence',jour).order('id').range(de,de+999) as any,1),
        lirePagesParalleles<any>(de=>supabase.from('presentiel_heures_validees').select('id,apprenant_id,heures').in('apprenant_id',lot).eq('date_presence',jour).order('id').range(de,de+999) as any,1),
      ]);signatures.push(...s);papier.push(...p);heures.push(...h);
    }
    const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
    return absentsSessionJour({inscriptions,signatures,papier,heures,jour,minuteParis:minutes(clock)});
  }catch{return new Set();}
}