import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Bouton Admin « 🔄 Autoriser un nouveau passage » — réservé aux passages
 * identifiés comme effectués sur une version erronée de l'examen.
 *
 * Il crée UNIQUEMENT une autorisation exceptionnelle qui lève le délai de 48 h
 * pour une prochaine tentative. Il ne supprime aucune tentative, ne modifie
 * aucune note, aucune QRC, ne recalcule aucun résultat et ne crée aucune
 * tentative automatiquement : l'apprenant lance lui-même son nouveau passage,
 * qui prend le snapshot de la version actuelle de l'examen.
 */
interface Props {
  apprenantId: string;
  examId: string;
  examTitre: string;
  /** Identifiants des écritures du passage contaminé (journalisation seule). */
  resultIds: string[];
}

export function AutoriserNouveauPassageButton({ apprenantId, examId, examTitre, resultIds }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<{ id: string; consumed_at: string | null } | null>(null);

  const refresh = async () => {
    const { data } = await supabase
      .from("exam_retake_authorizations" as any)
      .select("id, consumed_at")
      .eq("apprenant_id", apprenantId)
      .eq("exam_id", examId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    const row = (data as any[])?.[0] ?? null;
    setExisting(row ? { id: row.id, consumed_at: row.consumed_at } : null);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apprenantId, examId]);

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const motif =
        "Nouveau passage autorisé par Admin à la suite d'un passage effectué sur une version erronée";
      const { error } = await supabase.from("exam_retake_authorizations" as any).insert({
        apprenant_id: apprenantId,
        exam_id: examId,
        motif,
        result_ids: resultIds,
        granted_by: userRes?.user?.id ?? null,
        granted_email: userRes?.user?.email ?? null,
      });
      if (error) throw error;

      await supabase.from("audit_logs" as any).insert({
        action: "exam_retake_authorized",
        admin_user_id: userRes?.user?.id,
        admin_email: userRes?.user?.email ?? null,
        apprenant_id: apprenantId,
        details: { exam_id: examId, exam_titre: examTitre, result_ids: resultIds, motif },
      });

      toast.success("Nouveau passage autorisé. L'ancienne tentative est conservée intacte.");
      setOpen(false);
      refresh();
    } catch (e: any) {
      toast.error(`Impossible d'autoriser le nouveau passage : ${e?.message ?? "erreur inconnue"}`);
    } finally {
      setSaving(false);
    }
  };

  if (existing && !existing.consumed_at) {
    return (
      <Badge variant="outline" className="text-xs border-blue-400 text-blue-700">
        ✅ Nouveau passage déjà autorisé (en attente que l'apprenant le lance)
      </Badge>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-blue-400 text-blue-700 hover:bg-blue-50"
        onClick={() => setOpen(true)}
      >
        🔄 Autoriser un nouveau passage {examTitre}
      </Button>
      {existing?.consumed_at && (
        <span className="ml-2 text-xs text-muted-foreground">
          (une autorisation précédente a déjà été utilisée)
        </span>
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Autoriser un nouveau passage</AlertDialogTitle>
            <AlertDialogDescription>
              L'ancienne tentative restera conservée. Un nouveau passage sera autorisé avec la
              version actuelle de l'{examTitre}. Continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={saving}
            >
              {saving ? "Enregistrement…" : "Continuer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AutoriserNouveauPassageButton;
