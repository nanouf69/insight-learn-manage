import { useEffect, useRef, useState } from "react";
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
  const generation=useRef(0);
  useEffect(() => {
    generation.current += 1;
    setSelection(null); setContext(null); setError(null); setBusy(false);
    lock.current=false; operation.current=null;
    return () => { generation.current += 1; };
  }, [target.apprenantId,target.examId,target.filiere,target.matiereId,target.resultId,target.prenom,target.nom,target.examLabel,target.matiereNom]);
  const sameIdentity = selection?.apprenantId === target.apprenantId
    && selection?.examId === target.examId && selection?.filiere === target.filiere
    && selection?.matiereId === target.matiereId && selection?.resultId === target.resultId
    && selection?.prenom === target.prenom && selection?.nom === target.nom
    && selection?.examLabel === target.examLabel && selection?.matiereNom === target.matiereNom;
  const identified = Boolean(target.apprenantId && target.prenom.trim() && target.nom.trim()
    && target.examId && target.filiere && target.matiereId && target.matiereNom);

  async function loadSelection(selected: ResetMatiereAdminTarget) {
    if(lock.current)return;
    const request=++generation.current;
    lock.current=true; setBusy(true); setError(null); setContext(null);
    setSelection({...selected}); operation.current=crypto.randomUUID();
    try {
      const c=await readSubjectResetContext(selected.apprenantId,selected.examId,selected.matiereId);
      if(request!==generation.current)return;
      if(c.apprenant_id!==selected.apprenantId || c.exam_id!==selected.examId || c.matiere_id!==selected.matiereId
        || c.learner_name!==`${selected.prenom} ${selected.nom}`.trim() || c.filiere!==selected.filiere)
        throw new Error('Nom, matière ou filière non concordants. Aucune autorisation envoyée.');
      if((c.source_result_id ?? null)!==(selected.resultId ?? null))throw new Error('Le résultat affiché a changé ; relisez le panneau avant confirmation.');
      setContext(c);
    } catch(e){if(request===generation.current)setError(e instanceof Error?e.message:'Lecture impossible.');}
    finally{if(request===generation.current){lock.current=false;setBusy(false);}}
  }

  return (
    <>
      <Button variant="outline" size="sm" className="h-auto min-h-9 whitespace-normal text-destructive border-destructive/40"
        disabled={!identified || busy} onClick={()=>void loadSelection(target)}
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
              Les autres examens, Bilans et révisions des questions fausses ne sont pas concernés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {busy && <p className="text-sm text-muted-foreground">Vérification en cours…</p>}
          {context?.expired_empty && <p className="text-sm">La copie expirée sans réponse sera clôturée sans note et conservée. Le nouveau chronomètre ne démarrera qu’au choix de l’élève.</p>}
          {(error || context?.reason) && <p role="alert" className="text-sm text-destructive">{error || context?.reason}</p>}
          {error && <Button variant="outline" disabled={busy || !selection || !sameIdentity} onClick={()=>{if(selection)void loadSelection(selection);}}>Relire cette matière</Button>}
          {context?.authorization_id && <p role="status" className="text-sm">Autorisation déjà enregistrée pour cette matière. L’élève peut choisir « Refaire la matière » dans son espace. Aucune nouvelle note ni chronomètre avant son choix.</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{context?.authorization_id ? 'Fermer' : 'Annuler'}</AlertDialogCancel>
            {!context?.authorization_id && <Button variant="destructive" disabled={busy || Boolean(error) || !context || !sameIdentity || ['en_cours','ambigu'].includes(context.status)}
              onClick={async()=>{
                if(lock.current || !context || !operation.current || !sameIdentity)return;
                const request=++generation.current;
                lock.current=true;setBusy(true);setError(null);
                try {const current=await authorizeSubjectReset(context,operation.current);if(request===generation.current){setContext(current);onAuthorized?.();}}
                catch(e){if(request===generation.current)setError(e instanceof Error?e.message:'Autorisation non confirmée.');}
                finally{if(request===generation.current){lock.current=false;setBusy(false);}}
              }}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Confirmer cette matière
            </Button>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}