import {supabase} from '@/integrations/supabase/client';
import {fetchAllRows} from '@/lib/supabase/fetch-all-rows';
import {periodePedagogiqueProuvee,conserverDatesActiviteAnterieures,type ActivitePedagogiquePreuve} from './attestationActivitesPedagogiques';
import {chargerCalculJalons,formationJalonsElearning} from './jalonsPedagogiques';
import {chargerEtatGel} from './releveJalonsGel';
/** Paginated fresh read, owner identity from dossier. Open/navigation events do not prove reading. */
export async function chargerDatesPedagogiquesAttestation(apprenantId:string){
 const a=await supabase.from('apprenants').select('auth_user_id,date_fin_cours_en_ligne,date_fin_formation,type_apprenant,formation_choisie').eq('id',apprenantId).single();
 if(a.error||!a.data?.auth_user_id)throw new Error('Identité pédagogique non vérifiée');
 const uid=a.data.auth_user_id;
 const rows=await fetchAllRows<any>((from,to)=>supabase.from('reponses_apprenants').select('id,apprenant_id,user_id,status,submitted_at,reponses').eq('apprenant_id',apprenantId).eq('user_id',uid).eq('status','submitted').not('submitted_at','is',null).order('id').range(from,to));
 const preuves:ActivitePedagogiquePreuve[]=rows.filter(r=>Object.entries(r.reponses??{}).some(([k,v])=>!k.startsWith('_')&&v!=null&&v!==''&&JSON.stringify(v)!=='[]'&&JSON.stringify(v)!=='{}')).map(r=>({id:r.id,apprenantId:r.apprenant_id,userId:r.user_id,at:r.submitted_at,type:'exercice_remis',serveur:true,qualifiante:true}));
 const ancienCalcul=()=>({...periodePedagogiqueProuvee(preuves,apprenantId,uid),administrative:a.data.date_fin_cours_en_ligne||a.data.date_fin_formation||null,lectureEffectiveProuvee:false});
 const edof=await supabase.from('edof_fin_formation').select('mis_fin_formation').eq('apprenant_id',apprenantId).order('created_at',{ascending:false}).limit(1);
 const edofValide=edof.error?null:edof.data?.[0]?.mis_fin_formation??false;
 if(edofValide!==false)return ancienCalcul();
 let tauxJalons:number|null=null;
 if(formationJalonsElearning(a.data.type_apprenant,a.data.formation_choisie)){
  try {
   const etat=await chargerEtatGel(apprenantId);
   if(etat.etat!=='en_attente'){
    const calcul=await chargerCalculJalons({apprenantId,typeApprenant:a.data.type_apprenant,formationChoisie:a.data.formation_choisie,gel:etat.etat==='fige'?etat.gel:null});
    tauxJalons=calcul.resultat.taux;
   }
  }catch{/* Unknown/frozen unreadable evidence preserves the previous dates. */}
 }
 if(conserverDatesActiviteAnterieures(edofValide,tauxJalons))return ancienCalcul();
 const finFormation=a.data.date_fin_formation;
 if(!finFormation)throw new Error('Date de fin de formation non vérifiée');
 // Only unfinished, proven non-EDOF dossiers include the additional submissions.
 const rec=await supabase.from('bilan_future_receipts').select('id').eq('owner_id',uid);
 if(rec.error)throw new Error('Bilans examen illisibles');
 const recIds=(rec.data??[]).map((r:any)=>r.id);
 if(recIds.length){const sub=await supabase.from('bilan_future_submissions').select('receipt_id,submitted_at').in('receipt_id',recIds);
  if(sub.error)throw new Error('Bilans examen illisibles');
  for(const s of (sub.data??[]) as any[]) if(s.submitted_at) preuves.push({id:`bilan:${s.receipt_id}`,apprenantId,userId:uid,at:s.submitted_at,type:'quiz_remis',serveur:true,qualifiante:true});}
 const qz=await fetchAllRows<any>((from,to)=>supabase.from('apprenant_quiz_results').select('id,completed_at').eq('apprenant_id',apprenantId).not('completed_at','is',null).order('id').range(from,to));
 for(const r of qz) preuves.push({id:`quiz:${r.id}`,apprenantId,userId:uid,at:r.completed_at,type:'quiz_remis',serveur:true,qualifiante:true});
 return {...periodePedagogiqueProuvee(preuves,apprenantId,uid,finFormation),administrative:a.data.date_fin_cours_en_ligne||a.data.date_fin_formation||null,lectureEffectiveProuvee:false};
}