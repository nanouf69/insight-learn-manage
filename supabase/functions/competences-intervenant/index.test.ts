import { COMPETENCES_MODELE, COMPETENCES_VERSION, DECLARATION_COMPETENCES } from '../_shared/competencesIntervenant.ts';
let handler: (req: Request) => Promise<Response>;
const originalServe = Deno.serve;
const originalFetch = globalThis.fetch;
Object.defineProperty(Deno, 'serve', { value: (callback: typeof handler) => { handler = callback; }, configurable: true });
Deno.env.set('SUPABASE_URL', 'https://backend.test');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'fictional-service-test');
Deno.env.set('SUPABASE_ANON_KEY', 'fictional-public-test');
await import('./index.ts');
Object.defineProperty(Deno, 'serve', { value: originalServe, configurable: true });
const token = 'a'.repeat(64);
const uuid = '11111111-1111-4111-8111-111111111111';
const frozen = {version:COMPETENCES_VERSION,declaration:DECLARATION_COMPETENCES,expires_at:'2099-01-01T00:00:00Z'};
let doc: any; let admin = false; let calls: string[] = [];
let reviewSaved: any = null; let proofSaved: any = null; let qualiopiSaved: any = null; let linkSaved: any = null;
function reset() { doc={id:uuid,nom:'Justification',destinataire_nom:'Intervenant fictif',modele_version:COMPETENCES_VERSION,texte_fige:JSON.stringify(frozen),reponses:{},statut:'brouillon',signed_at:null};calls=[];admin=false;reviewSaved=null;proofSaved=null;qualiopiSaved=null;linkSaved=null; }
function crc32(bytes: Uint8Array) { let crc = 0xffffffff; for (const b of bytes) { crc ^= b; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Uint8Array) { const out = new Uint8Array(data.length + 12); new DataView(out.buffer).setUint32(0, data.length); out.set(new TextEncoder().encode(type), 4); out.set(data, 8); new DataView(out.buffer).setUint32(data.length + 8, crc32(out.slice(4, data.length + 8))); return out; }
async function png() {
 const w=120,h=60,ihdr=new Uint8Array(13);new DataView(ihdr.buffer).setUint32(0,w);new DataView(ihdr.buffer).setUint32(4,h);ihdr[8]=8;ihdr[9]=6;
 const raw=new Uint8Array((w*4+1)*h);for(let y=5;y<55;y++)for(let x=5;x<115;x++)if(Math.abs(y-30-Math.round(20*Math.sin(x/10)))<3){const o=y*(w*4+1)+1+x*4;raw[o+3]=255;}
 const compressed=await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer();
 const parts=[new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',new Uint8Array(compressed)),chunk('IEND',new Uint8Array())];
 const all=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){all.set(p,at);at+=p.length;}let binary='';for(const b of all)binary+=String.fromCharCode(b);return `data:image/png;base64,${btoa(binary)}`;
}
const criteresAcquis = () => Object.fromEntries(['maitrise_anglais','competences_pedagogiques','connaissance_programme','capacite_expliquer','adaptation_niveau','respect_programme','ponctualite_professionnalisme'].map(id=>[id,'acquis']));
globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
 const url = new URL(typeof input==='string' ? input : input instanceof URL ? input : input.url);
 if(url.hostname!=='backend.test') throw new Error('External network forbidden');
 const method=init?.method ?? 'GET';calls.push(method+' '+url.pathname+' '+url.search);
 if(url.pathname==='/auth/v1/user') return Response.json({id:uuid,email:'fictif@example.invalid'});
 if(url.pathname==='/rest/v1/rpc/has_role') return Response.json(admin);
 if(url.pathname==='/rest/v1/documents_a_signer') {
  if(method==='GET') {
   if(url.searchParams.get('modele_code')==='eq.validation_competences_responsable') {
    if(url.searchParams.has('cle_envoi')) return Response.json(reviewSaved?[reviewSaved]:[]);
    return Response.json(reviewSaved && url.searchParams.get('id')===`eq.${reviewSaved.id}`?reviewSaved:null);
   }
   if(url.searchParams.get('modele_code')!==`eq.${COMPETENCES_MODELE}` && url.searchParams.get('id')!==`eq.${uuid}`) return Response.json([]);
   if(url.searchParams.has('token') && url.searchParams.get('token')!==`eq.${token}`) return Response.json(null);
   return Response.json(doc);
  }
  if(method==='PATCH') { const update=JSON.parse(String(init?.body)); doc={...doc,...update}; return Response.json(doc); }
  if(method==='POST') { const inserted=JSON.parse(String(init?.body)); if(inserted.modele_code==='validation_competences_responsable') reviewSaved={...inserted}; return Response.json({id:inserted.id??uuid,reponses:inserted.reponses,signed_at:inserted.signed_at??'2026-11-24T16:00:00Z'}); }
 }
 if(url.pathname==='/rest/v1/profiles') return Response.json({full_name:'Responsable fictif'});
 if(url.pathname==='/rest/v1/intervenant_signature_preuves') {
  if(method==='GET') return Response.json(proofSaved);
  const inserted=JSON.parse(String(init?.body));proofSaved={...inserted,id:'33333333-3333-4333-8333-333333333333'};return Response.json(proofSaved);
 }
 if(url.pathname==='/rest/v1/qualiopi_preuves') {
  if(method==='GET') return Response.json(qualiopiSaved?{id:qualiopiSaved.id}:null);
  const inserted=JSON.parse(String(init?.body));qualiopiSaved={...inserted,id:'44444444-4444-4444-8444-444444444444'};return Response.json({id:qualiopiSaved.id});
 }
 if(url.pathname==='/rest/v1/qualiopi_preuve_liens') {
  if(method==='GET') return Response.json(linkSaved?{id:linkSaved.id}:null);
  const inserted=JSON.parse(String(init?.body));linkSaved={...inserted,id:'55555555-5555-4555-8555-555555555555'};return Response.json({id:linkSaved.id});
 }
 if(url.pathname.startsWith('/storage/v1/object/')) {
  if(method==='GET') return new Response('%PDF-1.7\nfictional');
  return Response.json({Key:'fictional'});
 }
 throw new Error('Unexpected endpoint '+url.pathname);
};
async function call(body: object, auth = false) { return await handler(new Request('https://app.test', {method:'POST',headers:{'Content-Type':'application/json',...(auth?{authorization:'Bearer fictional-test'}:{})},body:JSON.stringify(body)})); }
function equal(actual: unknown, expected: unknown) { if(actual!==expected) throw new Error(`Expected ${expected}, got ${actual}`); }
Deno.test('token is strict, unavailable token cannot enumerate documents', async()=>{reset();equal((await call({action:'get',token:'bad'})).status,404);equal(calls.length,0);equal((await call({action:'get',token:'b'.repeat(64)})).status,404);});
Deno.test('get scopes model and token and returns no CRM id, email, reviewer or secret',async()=>{reset();const response=await call({action:'get',token});equal(response.status,200);const data=await response.json();equal(data.document.id,undefined);equal(data.document.destinataire_email,undefined);equal(calls[0].includes('modele_code=eq.justification_competences_intervenant'),true);});
Deno.test('expired link refuses get and all writes',async()=>{reset();doc.texte_fige=JSON.stringify({...frozen,expires_at:'2020-01-01T00:00:00Z'});equal((await call({action:'upload',token})).status,404);equal(calls.some(c=>c.startsWith('POST ')),false);});
Deno.test('no declaration or missing factual fields cannot submit',async()=>{reset();equal((await call({action:'submit',token,reponses:{},declaration:false})).status,400);equal(calls.some(c=>c.startsWith('PATCH ')),false);});
Deno.test('signed declaration cannot be overwritten or upload new files',async()=>{reset();doc.statut='signe';doc.signed_at='2026-11-24';equal((await call({action:'submit',token})).status,409);equal((await call({action:'upload',token})).status,409);equal(calls.some(c=>c.startsWith('PATCH ')),false);});
Deno.test('uploaded MIME must match actual file content',async()=>{reset();equal((await call({action:'upload',token,mime:'application/pdf',data:btoa('<html>unsafe</html>')})).status,400);equal(calls.some(c=>c.includes('/storage/')),false);});
Deno.test('file from another dossier is refused, even with valid answers',async()=>{reset();const reponses=Object.fromEntries(['missions','experience','diplomes','cv','justificatifs'].map(k=>[k,'Fictif']));equal((await call({action:'submit',token,reponses,declaration:true,fichiers:[{nom:'CV.pdf',path:'competences/another/'+token}]})).status,403);equal(calls.some(c=>c.startsWith('PATCH ')),false);});
Deno.test('non-admin cannot read or validate an intervenant even knowing UUID',async()=>{reset();equal((await call({action:'admin_get',document_id:uuid},true)).status,403);equal((await call({action:'review',document_id:uuid,confirme:true},true)).status,403);equal(calls.some(c=>c.includes('/documents_a_signer')),false);});
Deno.test('admin cannot validate an unsubmitted declaration',async()=>{reset();admin=true;equal((await call({action:'review',document_id:uuid,confirme:true},true)).status,409);});
Deno.test('admin review requires actual method, justification and confirmation',async()=>{reset();admin=true;doc.statut='signe';doc.signed_at='2026-11-24';doc.reponses={declaration_acceptee:true};equal((await call({action:'review',document_id:uuid,decision:'valide',confirme:false},true)).status,400);equal(calls.some(c=>c.startsWith('POST /rest/v1/documents')),false);});
Deno.test('submit confirms exact own files and CAS write then readback',async()=>{reset();const bytes=new TextEncoder().encode('%PDF-1.7\nfictional');const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');const reponses=Object.fromEntries(['missions','experience','diplomes','cv','justificatifs'].map(k=>[k,'Fictif']));const result=await call({action:'submit',token,reponses,declaration:true,fichiers:[{nom:'CV.pdf',path:`competences/${uuid}/${digest}`}]});equal(result.status,200);equal((await result.json()).success,true);equal(calls.some(c=>c.startsWith('PATCH ')&&c.includes('statut=eq.brouillon')&&c.includes('signed_at=is.null')),true);equal(doc.reponses.declaration_texte,DECLARATION_COMPETENCES);equal(doc.reponses.responsable_id,undefined);});
Deno.test('responsible review is separate append-only, never updates applicant evidence',async()=>{reset();admin=true;doc.statut='signe';doc.signed_at='2026-11-24';doc.reponses={declaration_acceptee:true};const result=await call({action:'review',document_id:uuid,decision:'valide',confirme:true,methode:'Examen réel des diplômes pour une mission définie',motif:'Concordance vérifiée'},true);equal(result.status,200);equal(calls.some(c=>c.startsWith('PATCH ')),false);equal(calls.some(c=>c.startsWith('POST /rest/v1/documents_a_signer')),true);});
Deno.test('I21 requires all seven criteria, explicit examination and a real handwritten PNG',async()=>{reset();admin=true;doc.statut='signe';doc.signed_at='2026-11-24';doc.reponses={declaration_acceptee:true};const operation_id='66666666-6666-4666-8666-666666666666';const incomplete={...criteresAcquis()};delete incomplete.maitrise_anglais;equal((await call({action:'review_i21',document_id:uuid,operation_id,criteres:incomplete,commentaire:'',confirme:true,signature:await png()},true)).status,400);equal((await call({action:'review_i21',document_id:uuid,operation_id,criteres:criteresAcquis(),commentaire:'',confirme:false,signature:await png()},true)).status,400);equal((await call({action:'review_i21',document_id:uuid,operation_id,criteres:criteresAcquis(),commentaire:'',confirme:true,signature:''},true)).status,400);equal(reviewSaved,null);equal(calls.some(c=>c.includes('/storage/')),false);});
Deno.test('I21 signed evaluation stores private PDF, signature proof and Qualiopi link exactly once',async()=>{reset();admin=true;doc.statut='signe';doc.signed_at='2026-11-24';doc.reponses={declaration_acceptee:true,missions:'Mission fictive',fichiers:[]};const operation_id='66666666-6666-4666-8666-666666666666';const payload={action:'review_i21',document_id:uuid,operation_id,criteres:criteresAcquis(),commentaire:'',confirme:true,signature:await png()};const result=await call(payload,true);equal(result.status,200);equal(reviewSaved.id,operation_id);equal(reviewSaved.reponses.decision,'valide');equal(reviewSaved.reponses.commentaire,'');equal(Object.keys(reviewSaved.reponses.criteres).length,7);equal(reviewSaved.file_path,`competences/${uuid}/i21-${operation_id}.pdf`);equal(proofSaved.document_id,operation_id);equal(proofSaved.consentement_texte.includes('Je déclare avoir réellement examiné'),true);equal(qualiopiSaved.source_id,proofSaved.id);equal(linkSaved.indicateur,21);const documentWrites=calls.filter(c=>c.startsWith('POST /rest/v1/documents_a_signer')).length;const again=await call(payload,true);equal(again.status,200);equal((await again.json()).deja_enregistre,true);equal(calls.filter(c=>c.startsWith('POST /rest/v1/documents_a_signer')).length,documentWrites);});
