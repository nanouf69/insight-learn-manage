import { appliquerSignatureEmail } from './signatureEmail.ts';
export type ResultatEnvoiFc = {statut:'envoye'|'echec'|'indetermine'|'a_revoir'; providerId?:string; erreur?:string};
/** One HTTP attempt only; uncertain acceptance is NEVER automatically replayed. */
export async function transporterConvocationFc(p:{to:string;subject:string;html:string;envoiId:string;apiKey:string}, fetcher:typeof fetch=fetch):Promise<ResultatEnvoiFc> {
  try {
    const res=await fetcher('https://api.resend.com/emails',{
      method:'POST',signal:AbortSignal.timeout(20_000),
      headers:{Authorization:`Bearer ${p.apiKey}`,'Content-Type':'application/json','Idempotency-Key':`fc-convocation/${p.envoiId}`},
      body:JSON.stringify({from:'FTRANSPORT <contact@ftransport.fr>',to:[p.to],subject:p.subject,html:appliquerSignatureEmail(p.html)})
    });
    const raw=await res.text();
    if (res.status===429) return {statut:'echec',erreur:'Fournisseur indisponible (429), requête refusée'};
    if (res.status>=500 || res.status===408 || res.status===409) return {statut:'indetermine',erreur:`Livraison non prouvée (${res.status})`};
    if (!res.ok) return {statut:'a_revoir',erreur:`Refus fournisseur (${res.status})`};
    let data:unknown; try {data=JSON.parse(raw);} catch {return {statut:'indetermine',erreur:'Réponse fournisseur illisible'};}
    if (typeof data==='object' && data!==null && 'id' in data && typeof data.id==='string' && data.id) return {statut:'envoye',providerId:data.id};
    return {statut:'indetermine',erreur:'Accusé fournisseur absent'};
  } catch {return {statut:'indetermine',erreur:'Interruption réseau : livraison inconnue'};}
}