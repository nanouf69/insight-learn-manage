import {useEffect,useRef} from 'react';
import {Button} from '@/components/ui/button';

/** Mounted inside the fullscreen element, never portalled to body. */
export function ConfirmationInterne({message,onDecision}:{message:string;onDecision:(ok:boolean)=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const annuler=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const precedent=document.activeElement;
  const el=dialog.current;
  if(!el)return;
  el.showModal();
  annuler.current?.focus();
  return ()=>{el.close();if(precedent instanceof HTMLElement&&precedent.isConnected)precedent.focus({preventScroll:true});};
 },[]);
 return <dialog ref={dialog} aria-label="Confirmer la modification" aria-describedby="confirmation-qrc-message" onCancel={e=>{e.preventDefault();onDecision(false);}} className="max-w-md w-[calc(100%-2rem)] rounded-lg border border-border bg-background p-5 text-foreground shadow-lg backdrop:bg-background/80">
  <p id="confirmation-qrc-message" className="whitespace-pre-wrap">{message}</p>
  <div className="mt-5 flex justify-end gap-2"><Button ref={annuler} variant="outline" onClick={()=>onDecision(false)}>Annuler</Button><Button onClick={()=>onDecision(true)}>Confirmer</Button></div>
 </dialog>;
}