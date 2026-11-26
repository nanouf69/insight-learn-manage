import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { sendBrandedEmail } from '../_shared/send-branded-email.ts';
import { notificationFacture, envoiFactureAutorise } from '../_shared/factureRevisionRegles.ts';
import { envoyerAvisSuppression } from '../_shared/factureSuppressionEnvoi.ts';

const schema = z.union([
  z.object({ revisionId:z.string().uuid(), pdfBase64:z.string().max(7_000_000).optional() }).strict(),
  z.object({ suppressionId:z.string().uuid() }).strict(),
]);
const escaped = (s:string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));
const reply = (data:unknown,status=200) => new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});

Deno.serve(async req => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST') return reply({error:'Méthode non autorisée.'},405);
  let claimed:string|null=null;
  const url=Deno.env.get('SUPABASE_URL'); const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url || !key) return reply({error:'Service indisponible.'},503);
  const admin=createClient(url,key);
  try {
    const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
    if(!token) return reply({error:'Session expirée.'},401);
    const {data:auth,error:authError}=await admin.auth.getUser(token);
    if(authError || !auth.user) return reply({error:'Session expirée.'},401);
    const {data:role,error:roleError}=await admin.rpc('has_role',{_user_id:auth.user.id,_role:'admin'});
    if(roleError || role!==true) return reply({error:'Envoi réservé aux administrateurs.'},403);
    const input=schema.safeParse(await req.json());
    if(!input.success) return reply({error:'Référence ou PDF invalide.'},400);
    if ('suppressionId' in input.data) {
      const result = await envoyerAvisSuppression(admin, input.data.suppressionId, auth.user, {
        configure: !!Deno.env.get('RESEND_API_KEY'), envoyer: sendBrandedEmail,
      });
      return reply(result, 'envoye' in result && result.envoye ? 200 : 409);
    }
    const {data:r,error:readError}=await admin.from('facture_revisions').select('*').eq('id',input.data.revisionId).single();
    if(readError || !r) return reply({error:'Version de facture introuvable.'},404);
    if(r.statut_envoi==='envoye') return reply({envoye:true,revisionId:r.id,dejaEnvoye:true});
    if(!envoiFactureAutorise(r.statut_envoi)) return reply({error:'Envoi déjà commencé ou résultat non confirmé : ne pas renvoyer.',statut:r.statut_envoi},409);
    const {data:f,error:invoiceError}=await admin.from('factures').select('updated_at').eq('id',r.facture_id).single();
    const apres=r.apres as {numero:string;statut:string;updated_at:string};
    if(invoiceError || !f || new Date(f.updated_at).getTime()!==new Date(apres.updated_at).getTime()) return reply({error:'Une version plus récente existe. Ne pas envoyer cette ancienne version.'},409);
    if(!Deno.env.get('RESEND_API_KEY')) return reply({error:'Facture enregistrée, mais service email non configuré. Aucun mail envoyé.'},503);
    const notice=notificationFacture(r.avant as {numero:string},apres);
    let attachment:string|undefined;
    let path:string|null=null;
    if(!notice.annulation){
      const base64=input.data.pdfBase64;
      if(!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) return reply({error:'PDF de la nouvelle facture obligatoire.'},400);
      const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
      if(bytes.length>5*1024*1024 || new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-') return reply({error:'PDF invalide ou supérieur à 5 Mo.'},400);
      path=`${r.facture_id}/${r.id}.pdf`;
      const {error:uploadError}=await admin.storage.from('factures-revisions').upload(path,bytes,{contentType:'application/pdf',upsert:false});
      if(uploadError){
        const {data:existing,error:downloadError}=await admin.storage.from('factures-revisions').download(path);
        if(downloadError || !existing) return reply({error:'Facture enregistrée, mais conservation du PDF impossible. Aucun mail envoyé.'},503);
        // A previously prepared PDF is immutable: retry sends the retained bytes, not a new rendering.
        const saved=new Uint8Array(await existing.arrayBuffer());
        attachment=btoa(Array.from(saved,b=>String.fromCharCode(b)).join(''));
      } else attachment=base64;
    }
    const {data:claim,error:claimError}=await admin.from('facture_revisions').update({statut_envoi:'en_cours',pdf_path:path}).eq('id',r.id).eq('statut_envoi','a_envoyer').select('id').maybeSingle();
    if(claimError || !claim) return reply({error:'Envoi déjà pris en charge. Ne pas renvoyer.'},409);
    claimed=r.id;
    const messageId=await sendBrandedEmail({to:r.destinataire,subject:notice.sujet,
      html:`<p>Bonjour,</p><p>${escaped(notice.message)}</p>`,
      attachments:attachment?[{name:`Facture_${apres.numero.replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`,contentType:'application/pdf',contentBytes:attachment}]:[]});
    if(!messageId) throw new Error('Envoi non confirmé ou destinataire bloqué.');
    const {error:ackError}=await admin.from('facture_revisions').update({statut_envoi:'envoye',envoi_le:new Date().toISOString(),message_id:messageId}).eq('id',r.id).eq('statut_envoi','en_cours');
    if(ackError) throw new Error('Email accepté, confirmation locale non enregistrée.');
    return reply({envoye:true,revisionId:r.id});
  } catch(error){
    const text=error instanceof Error?error.message:'Erreur inconnue';
    if(claimed) await admin.from('facture_revisions').update({statut_envoi:'indetermine',erreur:text.slice(0,1000)}).eq('id',claimed).eq('statut_envoi','en_cours');
    console.error('[facture-notifier-revision]',text);
    return reply({error:claimed?'Facture conservée, mais envoi non confirmé. Vérifiez l’historique avant tout renvoi.':'Facture conservée, mais le mail n’a pas été envoyé.',statut:claimed?'indetermine':'a_envoyer'},502);
  }
});