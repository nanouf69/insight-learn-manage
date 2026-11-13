import {supabase} from '@/integrations/supabase/client';
import {fetchAllRows} from '@/lib/supabase/fetch-all-rows';
import {periodePedagogiqueProuvee,type ActivitePedagogiquePreuve} from './attestationActivitesPedagogiques';
/** Paginated fresh read, owner identity from dossier. Open/navigation events do not prove reading. */
export async function chargerDatesPedagogiquesAttestation(apprenantId:string){
 const a=await supabase.from('apprenants').select('auth_user_id,date_fin_cours_en_ligne,date_fin_formation').eq('id',apprenantId).single();
 if(a.error||!a.data?.auth_user_id)throw new Error('Identité pédagogique non vérifiée');
 const uid=a.data.auth_user_id;
 const rows=await fetchAllRows<any>((from,to)=>supabase.from('reponses_apprenants').select('id,apprenant_id,user_id,status,submitted_at,reponses').eq('apprenant_id',apprenantId).eq('user_id',uid).eq('status','submitted').not('submitted_at','is',null).order('id').range(from,to));
 const preuves:ActivitePedagogiquePreuve[]=rows.filter(r=>Object.entries(r.reponses??{}).some(([k,v])=>!k.startsWith('_')&&v!=null&&v!==''&&JSON.stringify(v)!=='[]'&&JSON.stringify(v)!=='{}')).map(r=>({id:r.id,apprenantId:r.apprenant_id,userId:r.user_id,at:r.submitted_at,type:'exercice_remis',serveur:true,qualifiante:true}));
 return {...periodePedagogiqueProuvee(preuves,apprenantId,uid),administrative:a.data.date_fin_cours_en_ligne||a.data.date_fin_formation||null,lectureEffectiveProuvee:false};
}