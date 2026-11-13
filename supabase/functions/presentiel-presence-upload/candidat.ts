// Candidate only: deliberately no index.ts, no deployment or live imports.
import { PDFDocument } from 'npm:pdf-lib@1.17.1';
import { z } from 'npm:zod@3.25.76';
const identite = z.object({ operationId:z.string().uuid(), apprenantId:z.string().uuid() }).strict();
export async function analyserPdfPresence(bytes: Uint8Array, mime: string) {
  if(mime!=='application/pdf' || bytes.length===0 || bytes.length>4194304) throw new Error('PDF uniquement, 4 Mo maximum');
  const decoder=new TextDecoder();
  if(decoder.decode(bytes.slice(0,5))!=='%PDF-' || !decoder.decode(bytes.slice(-2048)).includes('%%EOF')) throw new Error('PDF invalide');
  const document=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false,throwOnInvalidObject:true});
  if(document.getPageCount()<1 || document.getPageCount()>500) throw new Error('Nombre de pages PDF invalide');
  // Do not serve uploaded active content; downloadable attachment only.
  const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer);
  return {sha256:[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join(''),taille:bytes.length};
}
export interface DepotPresencePrive {
  verifierAdministrateur(token:string):Promise<{id:string}>;
  deposerImmuable(path:string,bytes:Uint8Array):Promise<void>;
  relire(path:string):Promise<Uint8Array>;
  journaliser(row:{id:string;operation_id:string;apprenant_id:string;auteur:string;chemin:string;sha256:string;taille:number}):Promise<void>;
}
export async function deposerPdfPresence(token:string,commande:unknown,file:File,port:DepotPresencePrive) {
  const c=identite.parse(commande);
  const auteur=await port.verifierAdministrateur(token); // Validate JWT and server role BEFORE reading/storing bytes.
  if(!/\.pdf$/i.test(file.name) || file.size>4194304) throw new Error('PDF uniquement, 4 Mo maximum');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const integrity=await analyserPdfPresence(bytes,file.type);
  const path=`${c.apprenantId}/${c.operationId}/${integrity.sha256}.pdf`;
  await port.deposerImmuable(path,bytes); // Must enforce private bucket, upsert:false; no client path/name.
  const saved=await analyserPdfPresence(await port.relire(path),'application/pdf');
  if(saved.sha256!==integrity.sha256 || saved.taille!==integrity.taille) throw new Error('Lecture du PDF différente : présence non autorisée');
  // A failed journal leaves an unlinked private object, never a presence receipt; no destructive cleanup.
  const row={id:c.operationId,operation_id:c.operationId,apprenant_id:c.apprenantId,auteur:auteur.id,chemin:path,...integrity};
  await port.journaliser(row);
  return row;
}