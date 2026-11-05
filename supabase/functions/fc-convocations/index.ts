import {createClient} from 'npm:@supabase/supabase-js@2';
import {corsHeaders} from 'npm:@supabase/supabase-js@2/cors';
import {z} from 'npm:zod@3';
import {rendreConvocationFc} from '../_shared/fcConvocationsRegles.ts';
import {transporterConvocationFc} from '../_shared/fcConvocationsEnvoi.ts';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
// PREPARED ONLY: needs explicit deployment + activation + protected scheduler secret.
Deno.serve(async req=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST') return json({error:'Méthode refusée'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anon=Deno.env.get('SUPABASE_ANON_KEY');
  if(!url||!key||!anon) return json({error:'Service non configuré'},503);
  const admin=createClient(url,key);
  const scheduler=Deno.env.get('FC_CONVOCATIONS_CRON_SECRET');
  const cron=!!scheduler && req.headers.get('x-fc-cron-secret')===scheduler;
  if(!cron){
    const auth=req.headers.get('Authorization'); if(!auth) return json({error:'Non autorisé'},401);
    const caller=createClient(url,anon,{global:{headers:{Authorization:auth}}});
    const {data,error}=await caller.auth.getClaims(auth.replace(/^Bearer /,''));
    const uid=data?.claims?.sub; if(error||!uid) return json({error:'Non autorisé'},401);
    const role=await admin.rpc('has_role',{_user_id:uid,_role:'admin'});
    if(role.error||role.data!==true) return json({error:'Réservé aux administrateurs'},403);
  }
  const body=z.object({action:z.literal('traiter')}).strict().safeParse(await req.json().catch(()=>null));
  if(!body.success) return json({error:'Action invalide'},400);
  const apiKey=Deno.env.get('RESEND_API_KEY'); if(!apiKey) return json({error:'Envoi non configuré'},503);
  try {
    const cfg=await admin.from('fc_convocation_config').select('actif').eq('id',true).single();
    if(cfg.error) throw cfg.error;
    if(cfg.data.actif!==true) return json({ok:true,statut:'desactive',envoyes:0});
    const {data:p,error}=await admin.rpc('fc_convocation_claim'); if(error) throw error;
    if(!p) return json({ok:true,statut:'aucun_envoi',envoyes:0});
    let message:{subject:string;html:string};
    try {message=rendreConvocationFc(p.modele,p.stagiaire,p.session,p.inscription,new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Paris'}));}
    catch {
      const fin=await admin.rpc('fc_convocation_finir',{p_envoi:p.envoi_id,p_claim:p.claim_id,p_statut:'a_revoir',p_erreur:'Modèle officiel ou session à vérifier'});
      if(fin.error||fin.data!==true) throw new Error('Journal non confirmé');
      return json({ok:false,statut:'a_revoir',envoyes:0});
    }
    const r=await transporterConvocationFc({to:p.stagiaire.email,...message,envoiId:p.envoi_id,apiKey});
    const fin=await admin.rpc('fc_convocation_finir',{p_envoi:p.envoi_id,p_claim:p.claim_id,p_statut:r.statut,p_provider:r.providerId??null,p_erreur:r.erreur??null,p_message:message});
    if(fin.error||fin.data!==true) return json({error:'Issue fournisseur reçue mais journal non confirmé : aucun renvoi automatique'},503);
    return json({ok:r.statut==='envoye',statut:r.statut,envoyes:r.statut==='envoye'?1:0});
  } catch {return json({error:'Traitement interrompu, consulter le journal des convocations'},503);}
});