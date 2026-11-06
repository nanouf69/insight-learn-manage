import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Déclaration de l'élève uniquement : aucune écriture serveur, pas une preuve d'autorisation du formateur. */
export default function ConfirmationPresentielEB({ open, nom, prenom, examLibelle, onConfirm, onCancel }: {
  open: boolean;
  nom?: string | null;
  prenom?: string | null;
  examLibelle?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [coche, setCoche] = useState(false);
  useEffect(() => { if (open) setCoche(false); }, [open]);
  const identite = [prenom, nom ? String(nom).toUpperCase() : null].filter(Boolean).join(" ") || "Nom non disponible";
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="confirmation-presentiel-eb">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" /> Attention — Examen blanc en présentiel
          </DialogTitle>
          {examLibelle ? <DialogDescription>{examLibelle}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 text-center">
            <p className="text-xs text-muted-foreground">Compte connecté</p>
            <p className="text-xl font-bold" data-testid="identite-compte">{identite}</p>
          </div>
          <p>Vérifiez que vous êtes bien connecté à votre compte personnel.</p>
          <p className="font-semibold">Ne commencez pas l'examen blanc avant d'avoir reçu la confirmation de votre formateur.</p>
          <p>Toute utilisation du mauvais compte peut entraîner des erreurs d'enregistrement, de synchronisation et de résultats.</p>
          <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
            <Checkbox checked={coche} onCheckedChange={(v) => setCoche(v === true)} className="mt-0.5" aria-label="Confirmation identité et autorisation" />
            <span>Je confirme que le nom et le prénom affichés sont bien les miens et que mon formateur m'a autorisé à commencer cet examen.</span>
          </label>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">Annuler</Button>
          <Button disabled={!coche} onClick={onConfirm} className="w-full sm:w-auto">Commencer l'examen blanc</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
