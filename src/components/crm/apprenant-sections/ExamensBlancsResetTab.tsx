import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
import { RotateCcw, Trophy, Calendar, Hash, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ExamensBlancsResetTabProps {
  apprenant: {
    id: string;
    nom: string;
    prenom: string;
  };
}

interface MatiereResult {
  matiere_id: string;
  matiere_nom: string;
  tentatives: number;
  meilleur_score: number;
  score_max: number;
  derniere_date: string;
  quiz_ids: string[];
}

export default function ExamensBlancsResetTab({ apprenant }: ExamensBlancsResetTabProps) {
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<MatiereResult | null>(null);
  const [resetting, setResetting] = useState(false);

  const { data: resultats = [], isLoading } = useQuery({
    queryKey: ["examen-blanc-results-admin", apprenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apprenant_quiz_results")
        .select("*")
        .eq("apprenant_id", apprenant.id)
        .eq("quiz_type", "examen_blanc");

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by matiere
      const grouped = new Map<string, MatiereResult>();
      for (const row of data) {
        const mId = row.matiere_id ?? "unknown";
        const mNom = row.matiere_nom ?? "Matière inconnue";
        const existing = grouped.get(mId);
        if (existing) {
          existing.tentatives += 1;
          if ((row.score_obtenu ?? 0) > existing.meilleur_score) {
            existing.meilleur_score = row.score_obtenu ?? 0;
            existing.score_max = row.score_max ?? 20;
          }
          if (row.completed_at > existing.derniere_date) {
            existing.derniere_date = row.completed_at;
          }
          if (!existing.quiz_ids.includes(row.quiz_id)) {
            existing.quiz_ids.push(row.quiz_id);
          }
        } else {
          grouped.set(mId, {
            matiere_id: mId,
            matiere_nom: mNom,
            tentatives: 1,
            meilleur_score: row.score_obtenu ?? 0,
            score_max: row.score_max ?? 20,
            derniere_date: row.completed_at,
            quiz_ids: [row.quiz_id],
          });
        }
      }

      return Array.from(grouped.values()).sort((a, b) => a.matiere_nom.localeCompare(b.matiere_nom));
    },
    enabled: !!apprenant.id,
  });

  const handleReset = async (matiere: MatiereResult) => {
    setResetting(true);
    try {
      // Get admin info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Session expirée");
        return;
      }

      // Delete quiz results for this matiere + apprenant
      const { error: deleteError } = await supabase
        .from("apprenant_quiz_results")
        .delete()
        .eq("apprenant_id", apprenant.id)
        .eq("quiz_type", "examen_blanc")
        .eq("matiere_id", matiere.matiere_id);

      if (deleteError) throw deleteError;

      // Log audit entry
      const { error: auditError } = await supabase
        .from("audit_logs")
        .insert({
          action: "reset_examen_blanc",
          admin_user_id: user.id,
          admin_email: user.email ?? null,
          apprenant_id: apprenant.id,
          apprenant_nom: `${apprenant.prenom} ${apprenant.nom}`,
          details: {
            matiere_id: matiere.matiere_id,
            matiere_nom: matiere.matiere_nom,
            tentatives_supprimees: matiere.tentatives,
            meilleur_score: matiere.meilleur_score,
            score_max: matiere.score_max,
          },
        });

      if (auditError) {
        console.error("Erreur audit log:", auditError);
      }

      toast.success(`Examen blanc "${matiere.matiere_nom}" réinitialisé pour ${apprenant.prenom} ${apprenant.nom}`);
      queryClient.invalidateQueries({ queryKey: ["examen-blanc-results-admin", apprenant.id] });
    } catch (err: any) {
      console.error("Erreur reset examen blanc:", err);
      toast.error(err?.message || "Erreur lors de la réinitialisation");
    } finally {
      setResetting(false);
      setConfirmTarget(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Examens blancs — Remise à zéro par matière
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Réinitialisez les résultats d'examen blanc de <strong>{apprenant.prenom} {apprenant.nom}</strong> par matière.
          L'action est tracée pour la conformité Qualiopi.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : resultats.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Aucun résultat d'examen blanc trouvé pour cet apprenant.
          </p>
        ) : (
          <div className="space-y-3">
            {resultats.map((mat) => {
              const note = mat.score_max > 0 ? ((mat.meilleur_score / mat.score_max) * 20).toFixed(1) : "0";
              return (
                <div
                  key={mat.matiere_id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">{mat.matiere_nom}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        Meilleur : {note}/20
                      </span>
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {mat.tentatives} tentative{mat.tentatives > 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(mat.derniere_date), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmTarget(mat)}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Remettre à zéro
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la remise à zéro</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment réinitialiser l'examen blanc <strong>"{confirmTarget?.matiere_nom}"</strong> pour{" "}
              <strong>{apprenant.prenom} {apprenant.nom}</strong> ?
              <br /><br />
              Cette action est <strong>irréversible</strong>. Les {confirmTarget?.tentatives} tentative(s) seront supprimées
              et l'apprenant pourra refaire cet examen blanc depuis zéro.
              <br /><br />
              <em className="text-xs">L'action sera enregistrée dans le journal d'audit (traçabilité Qualiopi/MCF).</em>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmTarget && handleReset(confirmTarget)}
              disabled={resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-1" />
              )}
              Confirmer la remise à zéro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
