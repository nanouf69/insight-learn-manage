import { useRef, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { readSubjectResetContext, authorizeSubjectReset, type SubjectResetContext } from '@/lib/adminSubjectReset';

export interface ResetMatiereAdminTarget {
  apprenantId: string;
  prenom: string;
  nom: string;
  examId: string;
  examLabel: string;
  filiere: string;
  matiereId: string;
  matiereNom: string;
  resultId?: string;
}

export function ResetMatiereAdminButton({ target, onAuthorized }: { target: ResetMatiereAdminTarget; onAuthorized?: () => void }) {
  const [selection, setSelection] = useState<ResetMatiereAdminTarget | null>(null);
  const [context,setContext]=useState<SubjectResetContext|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const lock=useRef(false);
  const operation=useRef<string|null>(null);
  const sameIdentity = selection?.apprenantId === target.apprenantId
    && selection?.examId === target.examId && selection?.filiere === target.filiere
    && selection?.matiereId === target.matiereId && selection?.resultId === target.resultId
    && selection?.prenom === target.prenom && selection?.nom === target.nom
    && selection?.examLabel === target.examLabel && selection?.matiereNom === target.matiereNom;
  const identified = Boolean(target.apprenantId && target.prenom.trim() && target.nom.trim()
    && target.examId && target.filiere && target.matiereId && target.matiereNom);

  return (
    <>
      <Button variant="outline" size="sm" className="h-auto min-h-9 whitespace-normal text-destructive border-destructive/40"
        disabled={!identified || busy} onClick={async () => {
          if(lock.current)return; lock.current=true; setBusy(true);setError(null);setContext(null);
          setSelection({...target});operation.current=crypto.randomUUID();
          try {
            const c=await readSubjectResetContext(target.apprenantId,target.examId,target.matiereId);
            if(c.learner_name!==`${target.prenom} ${target.nom}`.trim() || c.filiere!==target.filiere) throw new Error('Nom ou filière non concordants. Aucune autorisation envoyée.');
            if((c.source_result_id ?? null)!==(target.resultId ?? null))throw new Error('Le résultat affiché a changé ; relisez le panneau avant confirmation.');
            setContext(c);
          } catch(e){setError(e instanceof Error?e.message:'Lecture impossible.');}
          finally{lock.current=false;setBusy(false);}
        }}
        aria-label={`Réinitialiser la matière : ${target.matiereNom}`}>
        <RotateCcw className="h-4 w-4 shrink-0" />
        Réinitialiser la matière
      </Button>
      <AlertDialog open={Boolean(selection && sameIdentity)} onOpenChange={(open) => { if (!open && !busy) setSelection(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser la matière</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              Élève : <strong>{selection?.prenom} {selection?.nom}</strong><br />
              Examen : <strong>{selection?.examLabel}</strong><br />
              Matière : <strong>{selection?.matiereNom}</strong><br /><br />
              Seule cette matière sera à repasser, sur une nouvelle tentative non notée.
              L’ancienne copie et son résultat restent consultables ; les autres matières restent inchangées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {busy && <p className="text-sm text-muted-foreground">Vérification en cours…</p>}
          {(error || context?.reason) && <p role="alert" className="text-sm text-destructive">{error || context?.reason}</p>}
          {context?.authorization_id && <p role="status" className="text-sm">Autorisation déjà enregistrée pour cette matière. L’élève peut choisir « Refaire la matière » dans son espace. Aucune nouvelle note ni chronomètre avant son choix.</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{context?.authorization_id ? 'Fermer' : 'Annuler'}</AlertDialogCancel>
            {!context?.authorization_id && <Button variant="destructive" disabled={busy || !context || !sameIdentity || ['en_cours','ambigu'].includes(context.status)}
              onClick={async()=>{
                if(lock.current || !context || !operation.current || !sameIdentity)return;
                lock.current=true;setBusy(true);setError(null);
                try {setContext(await authorizeSubjectReset(context,operation.current));onAuthorized?.();}
                catch(e){setError(e instanceof Error?e.message:'Autorisation non confirmée.');}
                finally{lock.current=false;setBusy(false);}
              }}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Confirmer cette matière
            </Button>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}