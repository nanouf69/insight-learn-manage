/** Preparation only. Atomic repository must be implemented server-side before activation. */
export interface SignatureProof {
 id:string; documentId:string; zoneId:string; signataireId:string;
 image:string; signedAt:string; pdfArchiveId:string; documentFingerprint:string;
}
export interface SignatureRevocation {
 id:string; operationId:string; original:SignatureProof; auteur:string; annuleLe:string; motif:string|null;
}
export interface SignatureReplacement {
 id:string; operationId:string; revocationId:string; preuve:SignatureProof;
}
export interface RevisionRepository {
 /** Must serialize document+zone, and commit all journal/evidence records atomically. */
 transaction<T>(documentId:string,zoneId:string,run:(store:RevisionStore)=>Promise<T>):Promise<T>;
 identity():Promise<{id:string;admin:boolean}>;
 now():string;
 id():string;
 verifyImage(image:string):Promise<void>;
 archivePdf(proof:SignatureProof):Promise<boolean>;
}
export interface RevisionStore {
 original(id:string):Promise<SignatureProof|null>;
 revocation(id:string):Promise<SignatureRevocation|null>;
 revocationForProof(id:string):Promise<SignatureRevocation|null>;
 operation(id:string):Promise<SignatureRevocation|SignatureReplacement|null>;
 replacement(id:string):Promise<SignatureReplacement|null>;
 appendRevocation(row:SignatureRevocation):Promise<void>;
 appendReplacement(row:SignatureReplacement):Promise<void>;
}
export interface RevocationCommand {operationId:string;proofId:string;documentId:string;zoneId:string;expectedSignedAt:string;motif:string;confirme:boolean}
export async function annulerSignatureCandidate(repo:RevisionRepository,c:RevocationCommand) {
 const actor=await repo.identity();if(!actor.admin)throw new Error('Accès administrateur requis');
 if(c.confirme!==true||!c.operationId)throw new Error('Confirmation spécifique requise');
 const motif=c.motif.trim()||null;if((motif?.length??0)>200)throw new Error('Motif limité à 200 caractères');
 return repo.transaction(c.documentId,c.zoneId,async store=>{
  const original=await store.original(c.proofId);
  if(!original||original.documentId!==c.documentId||original.zoneId!==c.zoneId||original.signedAt!==c.expectedSignedAt)throw new Error('Identité ou version de signature non prouvée');
  if(!original.signataireId||!original.pdfArchiveId||!original.image||!original.documentFingerprint)throw new Error('Preuve originale incomplète');
  const replay=await store.operation(c.operationId);
  if(replay){if('original' in replay&&replay.original.id===original.id&&replay.auteur===actor.id&&replay.motif===motif)return replay;throw new Error('Opération contradictoire');}
  if(await store.revocationForProof(original.id))throw new Error('Signature déjà annulée : relire le dossier');
  if(!await repo.archivePdf(original))throw new Error('Archive PDF non confirmée : signature conservée');
  const row:SignatureRevocation={id:repo.id(),operationId:c.operationId,original:{...original},auteur:actor.id,annuleLe:repo.now(),motif};
  await store.appendRevocation(row);return row;
 });
}
export async function refaireSignatureCandidate(repo:RevisionRepository,c:{operationId:string;revocationId:string;documentId:string;zoneId:string;image:string;fingerprint:string;pdfArchiveId:string;confirme:boolean}) {
 const actor=await repo.identity();if(!c.confirme||!c.operationId)throw new Error('Consentement du signataire requis');
 return repo.transaction(c.documentId,c.zoneId,async store=>{
  const annulation=await store.revocation(c.revocationId);
  if(!annulation||annulation.original.documentId!==c.documentId||annulation.original.zoneId!==c.zoneId||annulation.original.signataireId!==actor.id)throw new Error('Seul le signataire authentifié peut refaire cette signature');
  if(c.fingerprint!==annulation.original.documentFingerprint||!c.pdfArchiveId)throw new Error('Document signé différent ou PDF non archivé');
  const replay=await store.operation(c.operationId);
  if(replay){if('preuve' in replay&&replay.revocationId===annulation.id&&replay.preuve.image===c.image&&replay.preuve.pdfArchiveId===c.pdfArchiveId)return replay;throw new Error('Opération contradictoire');}
  if(await store.replacement(annulation.id))throw new Error('Signature déjà refaite');
  await repo.verifyImage(c.image);
  const preuve:SignatureProof={...annulation.original,id:repo.id(),image:c.image,signedAt:repo.now(),pdfArchiveId:c.pdfArchiveId};
  if(!await repo.archivePdf(preuve))throw new Error('Nouveau PDF non confirmé : ancienne preuve conservée');
  const row:SignatureReplacement={id:repo.id(),operationId:c.operationId,revocationId:annulation.id,preuve};
  await store.appendReplacement(row);return row;
 });
}
/** Historical originals remain separately downloadable; only exact matching events affect current status. */
export function projectionSignatures(originals:readonly SignatureProof[],annulations:readonly SignatureRevocation[],remplacements:readonly SignatureReplacement[]) {
 return originals.map(original=>{
  const revoked=annulations.filter(a=>a.original.id===original.id&&a.original.documentId===original.documentId&&a.original.zoneId===original.zoneId&&a.original.signataireId===original.signataireId);
  if(revoked.length>1)throw new Error('Journal contradictoire');
  const a=revoked[0];if(!a)return {original,actuelle:original,statut:'signee' as const};
  const replacements=remplacements.filter(r=>r.revocationId===a.id);
  if(replacements.length>1)throw new Error('Révisions contradictoires');
  const r=replacements[0];
  if(r&&(r.preuve.documentId!==original.documentId||r.preuve.zoneId!==original.zoneId||r.preuve.signataireId!==original.signataireId||r.preuve.documentFingerprint!==original.documentFingerprint))throw new Error('Révision hors identité');
  return {original,actuelle:r?.preuve??null,statut:r?'refaite' as const:'a_refaire' as const};
 });
}