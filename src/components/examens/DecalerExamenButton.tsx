import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { decalerExamenTheorique, nouvelleOperationDecalage, prochaineSessionApres } from "@/lib/decalageExamenTheorique";

type Props = { apprenant: { id: string; nom: string; prenom: string; date_examen_theorique: string | null } };

export function DecalerExamenButton({ apprenant }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const opRef = useRef<string | null>(null);
  const prochaine = prochaineSessionApres(apprenant.date_examen_theorique);

  const confirmer = async () => {
    if (!prochaine || !apprenant.date_examen_theorique || busy) return;
    if (!opRef.current) opRef.current = nouvelleOperationDecalage();
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      await decalerExamenTheorique({
        operationId: opRef.current,
        apprenantId: apprenant.id,
        ancienneDate: apprenant.date_examen_theorique,
        nouvelle: prochaine,
        email: u?.user?.email,
      });
      toast.success(`${apprenant.prenom} ${apprenant.nom} décalé(e) au ${prochaine.date}`);
      setOpen(false);
      opRef.current = null;
      qc.invalidateQueries();
    } catch (e) {
      toast.error(`Décalage refusé : ${(e as Error).message}. Rien n'a été modifié.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) opRef.current = null; }}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          disabled={!prochaine}
          title={prochaine ? "📅 Décaler au prochain examen" : "Aucune prochaine session officielle"}
          aria-label="Décaler au prochain examen"
          className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
        >
          <CalendarClock className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>📅 Décaler {apprenant.prenom} {apprenant.nom} au prochain examen</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p><strong>Session actuelle :</strong> {apprenant.date_examen_theorique}</p>
              <p><strong>Nouvelle session :</strong> {prochaine?.date}
                {prochaine?.dateLimiteLibelle ? ` (date limite d'inscription : ${prochaine.dateLimiteLibelle})` : ""}</p>
              <p className="text-muted-foreground">
                Seul le rattachement à la session d'examen change. Dossier, documents, progression, examens blancs,
                notes et identifiants sont conservés.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
          <Button onClick={confirmer} disabled={busy}>{busy ? "Décalage…" : "Confirmer le décalage"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
