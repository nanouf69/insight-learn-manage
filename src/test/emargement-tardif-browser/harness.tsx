import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfirmationEmargementTardif } from '@/components/cours-en-ligne/ConfirmationEmargementTardif';
import { SignaturePad } from '@/components/onboarding/SignaturePad';
import { Button } from '@/components/ui/button';
import { evaluerSignatureDataUrl } from '@/lib/emargement/qualiteSignature';
import { signatureSingleFlight } from '@/lib/emargementTardif';
import '@/index.css';
const params = new URLSearchParams(location.search);
function Fixture() {
 const [open,setOpen]=useState(true), [sign,setSign]=useState(false),[signature,setSignature]=useState(''),[presence,setPresence]=useState(false),[identity,setIdentity]=useState(false),[result,setResult]=useState('');
 const [send] = useState(() => signatureSingleFlight(async () => {
   await new Promise(resolve => setTimeout(resolve,100));
   return { signed_at:'2026-11-13T13:10:00Z', date:'2026-10-30', count:1 };
 }));
 return <main className="mx-auto max-w-lg p-4 space-y-4">
  <h1 className="text-xl font-bold">Émargement fictif — 30 octobre 2026 · matin 09:00–12:00</h1>
  {open && <ConfirmationEmargementTardif date="vendredi 30 octobre 2026" creneau="Matin 09:00–12:00" existing={params.has('existing')} authorized={!params.has('denied')} active={!params.has('off')} onClose={()=>setOpen(false)} onContinue={()=>{setOpen(false);setSign(true);}} />}
  {sign && <><label className="flex gap-2"><input type="checkbox" checked={identity} onChange={e=>setIdentity(e.target.checked)} />Je confirme mon identité</label>
   <label className="flex gap-2"><input type="checkbox" checked={presence} onChange={e=>setPresence(e.target.checked)} />Je confirme avoir été présent au créneau matin</label>
   <SignaturePad value={signature} onChange={setSignature} />
   <Button disabled={!presence||!identity||!signature} onClick={async()=>{ const quality=await evaluerSignatureDataUrl(signature); if(!quality.ok){setResult('Signature invalide');return;} const receipt=await send();setResult(`Signé tardivement le 13/11/2026 à 14:10 (Paris) · date de formation ${receipt.date} · ${receipt.count} preuve conservée`); }}>Valider ma signature fictive</Button>
  </>}
  {result && <p role="status">{result}</p>}
 </main>;
}
const root=document.getElementById('root'); if(root) createRoot(root).render(<Fixture />);