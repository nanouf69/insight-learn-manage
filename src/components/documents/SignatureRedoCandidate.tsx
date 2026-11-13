/** Isolated candidate only: never mounted by a token-only public document page. */
import { useRef,useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SignaturePad } from '@/components/onboarding/SignaturePad';
export function SignatureRedoCandidate({signataireId,sessionId,zoneNom,submit,read}:{signataireId:string;sessionId:string|null;zoneNom:string;submit?:(image:string)=>Promise<{id:string}>;read?:(id:string)=>Promise<{id:string;image:string;signedAt:string;signataireId:string}>}) {
 const [image,setImage]=useState('');const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [receipt,setReceipt]=useState<string|null>(null);const inFlight=useRef(false);
 const eligible=!!sessionId && sessionId===signataireId;
 const save=async()=>{
  if(inFlight.current||!eligible||!submit||!read||!image||!consent)return;
  inFlight.current=true;setBusy(true);setError('');
  try{const result=await submit(image);const proof=await read(result.id);if(proof.id!==result.id||proof.image!==image||proof.signataireId!==signataireId||!Number.isFinite(Date.parse(proof.signedAt)))throw new Error('Relecture de la nouvelle signature non confirmée');setReceipt(proof.signedAt);}catch(e){setError(e instanceof Error?e.message:'Signature non confirmée');}finally{inFlight.current=false;setBusy(false);}
 };
 return <section className="space-y-4"><h2 className="font-semibold">Refaire ma signature — {zoneNom}</h2><p className="text-sm">L’original reste archivé. Effacer ce nouveau tracé ne modifie pas la signature enregistrée.</p>
 {!eligible&&<p role="alert" className="text-destructive">Le signataire doit être connecté à son propre compte.</p>}
 {receipt?<p role="status">Nouvelle signature confirmée le {new Date(receipt).toLocaleString('fr-FR',{timeZone:'Europe/Paris'})} (Paris)</p>:<><SignaturePad value={image} onChange={setImage} disabled={busy||!eligible}/><label className="flex items-start gap-2 text-sm"><Checkbox checked={consent} onCheckedChange={v=>setConsent(v===true)} disabled={busy||!eligible}/>Je confirme ce nouveau tracé pour cette zone uniquement.</label>{(!submit||!read)&&<p className="text-destructive text-sm">Nouvel enregistrement non activé.</p>}{error&&<p role="alert" className="text-destructive">{error}</p>}<Button disabled={!eligible||!submit||!read||!consent||!image||busy} onClick={save}>Enregistrer ma nouvelle signature</Button></>}
 </section>;
}