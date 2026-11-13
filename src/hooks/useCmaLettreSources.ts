import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetch-all-rows';
import type { CmaCandidat,CmaPreuve,CmaConfirmation } from '@/lib/cmaLettreSelection';
/** Read-only, no status mutations or mail calls. Unknown territories stay unknown. */
export function useCmaLettreSources(exam:string,period:string){
 return useQuery({queryKey:['cma-lettre-preuves',exam,period],queryFn:async()=>{
  const [candidats,preuves,confirmations]=await Promise.all([
   fetchAllRows<CmaCandidat>((f,t)=>supabase.from('apprenants').select('id,nom,prenom,type_apprenant,date_examen_theorique,date_examen_pratique,resultat_examen,resultat_examen_pratique,deleted_at,abandonnee').order('id').range(f,t)),
   fetchAllRows<CmaPreuve>((f,t)=>supabase.from('cma_planning_lignes').select('apprenant_id,date_examen,filiere').order('id').range(f,t)),
   fetchAllRows<CmaConfirmation>((f,t)=>supabase.from('session_apprenants').select('apprenant_id,statut_suivi,sessions:session_id(type_session,date_debut)').eq('statut_suivi','inscription_validee').order('id').range(f,t)),
  ]);return {candidats,preuves,confirmations};
 }});
}