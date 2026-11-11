import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ResetMatiereAdminTarget {
  apprenantId: string;
  prenom: string;
  nom: string;
  examId: string;
  examLabel: string;
  filiere: string;
  matiereId: string;
  matiereNom: string;
  resultId: string;
}

/** Preview only: no mutation transport until an admin-only, deferred-start
 * subject operation and its learner readback have passed isolated contracts.
 * Do not replace this gate with either of the global reset RPCs or with the
 * owner-only start_exam_subject_retake (which starts the learner's timer).
 */
export function ResetMatiereAdminButton({ target }: { target: ResetMatiereAdminTarget }) {
  const [selection, setSelection] = useState<ResetMatiereAdminTarget | null>(null);
  const sameIdentity = selection?.apprenantId === target.apprenantId
    && selection?.examId === target.examId && selection?.filiere === target.filiere
    && selection?.matiereId === target.matiereId && selection?.resultId === target.resultId
    && selection?.prenom === target.prenom && selection?.nom === target.nom
    && selection?.examLabel === target.examLabel && selection?.matiereNom === target.matiereNom;
  const identified = Boolean(target.apprenantId && target.prenom.trim() && target.nom.trim()
    && target.examId && target.filiere && target.matiereId && target.matiereNom && target.resultId);

  return (
    <>
      <Button variant="outline" size="sm" className="h-auto min-h-9 whitespace-normal text-destructive border-destructive/40"
        disabled={!identified} onClick={() => setSelection({ ...target })}
        aria-label={`Remettre cette matière à zéro : ${target.matiereNom}`}>
        <RotateCcw className="h-4 w-4 shrink-0" />
        Remettre cette matière à zéro
      </Button>
      <AlertDialog open={Boolean(selection && sameIdentity)} onOpenChange={(open) => { if (!open) setSelection(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Remettre cette matière à zéro</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              Élève : <strong>{selection?.prenom} {selection?.nom}</strong><br />
              Examen : <strong>{selection?.examLabel}</strong><br />
              Matière : <strong>{selection?.matiereNom}</strong><br /><br />
              Seule cette matière serait à repasser, sur une nouvelle tentative non notée.
              L’ancienne copie et son résultat resteraient consultables ; les autres matières seraient inchangées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p role="alert" className="text-sm text-destructive">
            Action indisponible : le repassage sécurisé par matière depuis l’administration n’est pas encore installé et vérifié.
            Aucune remise à zéro n’a été effectuée.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button variant="destructive" disabled>Confirmer cette matière</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}