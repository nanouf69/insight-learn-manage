import { PDFDocument } from 'npm:pdf-lib@1.17.1';
import { analyserPdfPresence,deposerPdfPresence,type DepotPresencePrive } from './candidat.ts';
const commande={operationId:'11111111-1111-4111-8111-111111111111',apprenantId:'22222222-2222-4222-8222-222222222222'};
async function pdf(){const d=await PDFDocument.create();d.addPage();return new Uint8Array(await d.save());}
async function refuse(f:()=>Promise<unknown>){try{await f();}catch{return;}throw new Error('Refus attendu');}
Deno.test('PDF réel analysé et empreinte vérifiée',async()=>{const r=await analyserPdfPresence(await pdf(),'application/pdf');if(r.sha256.length!==64)throw new Error('SHA256 absent');});
Deno.test('faux entête PDF refusé par parseur',async()=>await refuse(()=>analyserPdfPresence(new TextEncoder().encode('%PDF-1.4\n%%EOF'),'application/pdf')));
Deno.test('4 Mo dépassés refusés',async()=>await refuse(()=>analyserPdfPresence(new Uint8Array(4194305),'application/pdf')));
Deno.test('MIME image refusé',async()=>await refuse(async()=>analyserPdfPresence(await pdf(),'image/png')));
Deno.test('non-admin refusé avant dépôt',async()=>{
 let writes=0;const port:DepotPresencePrive={verifierAdministrateur:async()=>{throw new Error('Non admin');},deposerImmuable:async()=>{writes++;},relire:pdf,journaliser:async()=>{writes++;}};
 await refuse(()=>deposerPdfPresence('jeton-fictif',commande,new File(['x'],'x.pdf',{type:'application/pdf'}),port));if(writes!==0)throw new Error('Écriture non autorisée');
});
Deno.test('dépôt privé et relecture avant journal',async()=>{
 const bytes=await pdf();const events:string[]=[];const port:DepotPresencePrive={verifierAdministrateur:async()=>({id:'admin-fictif'}),deposerImmuable:async(path)=>{if(!path.endsWith('.pdf')||path.includes('cherni'))throw new Error('Nom utilisateur dans chemin');events.push('depot');},relire:async()=>{events.push('lecture');return bytes;},journaliser:async()=>{events.push('journal');}};
 await deposerPdfPresence('jeton-fictif',commande,new File([bytes],'cherni.pdf',{type:'application/pdf'}),port);if(events.join(',')!=='depot,lecture,journal')throw new Error('Ordre incorrect');
});
Deno.test('relecture corrompue ne journalise pas',async()=>{
 let wrote=false;const port:DepotPresencePrive={verifierAdministrateur:async()=>({id:'admin-fictif'}),deposerImmuable:async()=>{},relire:async()=>new Uint8Array([1]),journaliser:async()=>{wrote=true;}};
 await refuse(async()=>deposerPdfPresence('jeton-fictif',commande,new File([await pdf()],'x.pdf',{type:'application/pdf'}),port));if(wrote)throw new Error('Fausse preuve');
});