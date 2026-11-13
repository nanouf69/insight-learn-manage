// Candidate factory, deliberately not deployed: no index.ts.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { deposerPdfPresence } from './candidat.ts';
export function creerHandlerPresencePdf(url:string,anon:string,service:string) {
 return async(req:Request)=>{
  const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return response({error:'Méthode refusée'},405);
  try{
   const authorization=req.headers.get('Authorization') ?? '';
   if(!/^Bearer \S+$/.test(authorization))return response({error:'Session administrateur requise'},401);
   const utilisateur=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
   const session=await utilisateur.auth.getUser(authorization.slice(7));
   const uid=session.data?.user?.id;if(session.error||!uid)return response({error:'Session invalide'},401);
   const role=await utilisateur.from('user_roles').select('role').eq('user_id',uid).eq('role','admin').maybeSingle();
   if(role.error||!role.data)return response({error:'Accès administrateur requis'},403);
   // Bounded request BEFORE multipart decoding; browser uploads must include a content length.
   const length=Number(req.headers.get('Content-Length'));
   if(!Number.isInteger(length)||length<=0||length>4194304+65536)return response({error:'Taille du dépôt non vérifiable ou supérieure à 4 Mo'},413);
   const form=await req.formData();const file=form.get('pdf');
   if(!(file instanceof File))return response({error:'PDF requis'},400);
   const admin=createClient(url,service,{auth:{persistSession:false}});
   const bucket=await admin.storage.getBucket('presentiel-justificatifs');
   if(bucket.error||!bucket.data||bucket.data.public!==false)return response({error:'Dépôt privé non configuré'},503);
   const result=await deposerPdfPresence(authorization,{operationId:form.get('operationId'),apprenantId:form.get('apprenantId')},file,{
    verifierAdministrateur:async()=>({id:uid}),
    deposerImmuable:async(path,bytes)=>{
     const r=await admin.storage.from('presentiel-justificatifs').upload(path,bytes,{contentType:'application/pdf',upsert:false});
     if(r.error)throw new Error('Dépôt refusé : relire le dossier avant de réessayer');
    },
    relire:async(path)=>{const r=await admin.storage.from('presentiel-justificatifs').download(path);if(r.error||!r.data)throw new Error('Relecture du PDF impossible');return new Uint8Array(await r.data.arrayBuffer());},
    journaliser:async(row)=>{const r=await admin.from('presentiel_presence_pdf').insert(row);if(r.error)throw new Error('Journal du justificatif non confirmé : aucune présence validée');}
   });
   return response({id:result.id,sha256:result.sha256,taille:result.taille}); // Never expose private URL/service credentials.
  }catch{return response({error:'Dépôt non confirmé : aucune présence validée'},400);}
 };
}