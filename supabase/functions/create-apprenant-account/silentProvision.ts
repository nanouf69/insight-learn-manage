export const SESSIONS_VTC_NOVEMBRE = ['91f00853-2ac2-4da6-996b-4832fc132b6b','e8dee3f0-22bd-4187-ab61-41026b316e6c'];

/** Admin caller is verified by the existing handler. No notifications or access-date writes here. */
export async function verifierPreparationSilencieuse(client: any, id: string, email: string) {
  const {data:a,error} = await client.from('apprenants').select('id,email,type_apprenant,deleted_at,abandonnee,compte_cours_archive_at').eq('id',id).single();
  if(error || !a || a.type_apprenant?.toLowerCase() !== 'vtc' || a.deleted_at || a.abandonnee || a.compte_cours_archive_at
    || a.email?.trim().toLowerCase() !== email.trim().toLowerCase()) throw new Error('Dossier hors préparation VTC autorisée');
  const {data:rows,error:err} = await client.from('session_apprenants').select('session_id,liste_attente,emargements_exclus,statut_suivi,sessions:session_id(statut,date_debut,date_fin)').eq('apprenant_id',id);
  if(err || !rows?.some((r:any)=>SESSIONS_VTC_NOVEMBRE.includes(r.session_id) && !r.liste_attente && !r.emargements_exclus
    && !/annul|abandon|exclu|attente/i.test(`${r.statut_suivi??''} ${r.sessions?.statut??''}`)
    && r.sessions?.date_debut==='2026-11-02' && r.sessions?.date_fin==='2026-11-13')) throw new Error('Inscription novembre non éligible');
}

export async function lierCompteConfirme(client:any,id:string,userId:string) {
  const {data,error}=await client.from('apprenants').update({auth_user_id:userId}).eq('id',id).is('auth_user_id',null).select('id,auth_user_id').maybeSingle();
  if(error || data?.auth_user_id!==userId) throw new Error('Rattachement concurrent ou refusé : contrôle requis');
  const {data:confirmed,error:readError}=await client.from('apprenants').select('id,auth_user_id').eq('auth_user_id',userId);
  if(readError || confirmed?.length!==1 || confirmed[0].id!==id) throw new Error('Confirmation du rattachement unique impossible');
}