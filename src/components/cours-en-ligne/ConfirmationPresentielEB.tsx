import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Déclarations de l'élève uniquement : aucune écriture serveur, pas une approbation technique admin. */
export default function ConfirmationPresentielEB({ open, nom, prenom, examLibelle, onConfirm, onCancel }: {
  open: boolean;
  nom?: string | null;
  prenom?: string | null;
  examLibelle?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [compte, setCompte] = useState(false);
  const [formateur, setFormateur] = useState(false);
  useEffect(() => { if (open) { setCompte(false); setFormateur(false); } }, [open]);
  const identite = [prenom, nom ? String(nom).toUpperCase() : null].filter(Boolean).join(" ") || "Nom non disponible";
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="confirmation-presentiel-eb">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" /> Examen blanc en présentiel
          </DialogTitle>
          <DialogDescription>{examLibelle || "Confirmation avant de commencer"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 font-semibold text-destructive">
            Ne commencez pas l'examen blanc avant la confirmation du formateur.
          </p>
          <div className="space-y-2 rounded-lg border-2 border-primary bg-primary/5 p-4">
            <p className="text-base font-semibold" data-testid="question-compte">Êtes-vous bien {identite} ?</p>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={compte} onCheckedChange={(v) => setCompte(v === true)} className="mt-0.5" aria-label="Oui, je confirme que c'est bien mon compte." />
              <span>Oui, je confirme que c'est bien mon compte.</span>
            </label>
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <p className="text-base font-semibold">Avez-vous reçu l'autorisation de votre formateur pour commencer cet examen blanc ?</p>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={formateur} onCheckedChange={(v) => setFormateur(v === true)} className="mt-0.5" aria-label="Oui, mon formateur m'a autorisé à commencer." />
              <span>Oui, mon formateur m'a autorisé à commencer.</span>
            </label>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">Annuler</Button>
          <Button disabled={!(compte && formateur)} onClick={onConfirm} className="w-full sm:w-auto">Commencer l'examen blanc</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
