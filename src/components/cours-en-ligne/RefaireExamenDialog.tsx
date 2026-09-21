import { useEffect, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface RefaireExamenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Une tentative en cours est encore reprenable : on propose la reprise en priorité. */
  hasResumableAttempt?: boolean;
  onResume?: () => void;
  onConfirm: () => void;
}

/**
 * Double confirmation explicite avant de créer une NOUVELLE tentative d'examen blanc.
 * « Refaire » = créer une nouvelle tentative vierge. Aucune donnée existante
 * (réponses, QRC, corrections formateur, notes, résultats, snapshots, historiques)
 * n'est supprimée ni écrasée.
 */
export function RefaireExamenDialog({
  open,
  onOpenChange,
  hasResumableAttempt,
  onResume,
  onConfirm,
}: RefaireExamenDialogProps) {
  // Anti double-clic / double-déclenchement : une seule création par ouverture.
  const confirmedRef = useRef(false);
  useEffect(() => {
    if (open) confirmedRef.current = false;
  }, [open]);

  const handleConfirm = () => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onOpenChange(false);
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg border-2 border-amber-400">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            Attention — Refaire l'examen
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-foreground">
              <p>Vous êtes sur le point de recommencer cet examen blanc.</p>
              <p>
                Une nouvelle tentative va être créée et vous recommencerez l'examen depuis le début.
              </p>
              <p>
                Vos réponses et résultats de la tentative précédente resteront conservés dans votre
                historique, mais ils ne seront pas repris dans cette nouvelle tentative.
              </p>
              {hasResumableAttempt && (
                <p className="rounded-md border-2 border-orange-400 bg-orange-50 p-3 font-medium text-orange-800">
                  ⚠️ Vous avez une tentative en cours, non terminée. Vous pouvez encore la reprendre
                  là où vous vous êtes arrêté. Si vous créez une nouvelle tentative, vous ne pourrez
                  plus continuer les réponses de la tentative précédente (elles restent toutefois
                  conservées dans votre historique).
                </p>
              )}
              <p className="font-semibold">Êtes-vous certain de vouloir recommencer l'examen ?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          {hasResumableAttempt && onResume && (
            <Button
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onResume();
              }}
            >
              ▶ Reprendre mon examen
            </Button>
          )}
          <AlertDialogCancel className="w-full mt-0">
            Annuler et conserver ma tentative actuelle
          </AlertDialogCancel>
          <AlertDialogAction
            className="w-full bg-amber-600 hover:bg-amber-700"
            onClick={handleConfirm}
          >
            Oui, créer une nouvelle tentative
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default RefaireExamenDialog;
